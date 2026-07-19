import OrderItemModel from "../schema/OrderItem.model";
import OrderModel from "../schema/Order.model";
import ProductModel from "../schema/Product.model";
import { Member } from "../libs/types/member";
import {
  Order,
  OrderInquiry,
  OrderItemInput,
  OrderUpdateInput,
} from "../libs/types/order";
import { shapeIntoMongooseObjectId } from "../libs/types/config";
import Errors, { HttpCode, Message } from "../libs/types/errors";
import { ObjectId } from "mongoose";
import { OrderStatus } from "../libs/types/enums/order.enum";
import { ProductStatus } from "../libs/types/enums/product.enum";
import MemberService from "./Member.service";
import mongoose from "mongoose";

class OrderService {
  private readonly orderModel;
  private readonly orderItemModel;
  private readonly memberService;

  constructor() {
    this.orderModel = OrderModel;
    this.orderItemModel = OrderItemModel;
    this.memberService = new MemberService();
  }

  public async createOrder(
    member: Member,
    input: OrderItemInput[]
  ): Promise<Order> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    if (!Array.isArray(input) || input.length === 0) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }

    const requestedItemMap = new Map<string, { productId: any; itemQuantity: number }>();
    input.forEach((item: OrderItemInput) => {
      const productId = shapeIntoMongooseObjectId(item.productId);
      const key = String(productId);
      const existing = requestedItemMap.get(key);
      requestedItemMap.set(key, {
        productId,
        itemQuantity: (existing?.itemQuantity ?? 0) + Number(item.itemQuantity),
      });
    });
    const requestedItems = Array.from(requestedItemMap.values());

    if (
      requestedItems.some(
        (item) => !Number.isInteger(item.itemQuantity) || item.itemQuantity <= 0
      )
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }

    const products = await ProductModel.find({
      _id: { $in: requestedItems.map((item) => item.productId) },
      productStatus: ProductStatus.PROCESS,
    })
      .lean()
      .exec();

    const productMap = new Map(products.map((product: any) => [String(product._id), product]));
    if (productMap.size !== requestedItems.length) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.NO_DATA_FOUND);
    }

    const orderItems = requestedItems.map((item) => {
      const product = productMap.get(String(item.productId));
      if (!product || product.productLeftCount < item.itemQuantity) {
        throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
      }

      return {
        productId: item.productId,
        itemQuantity: item.itemQuantity,
        itemPrice: product.productPrice,
      } as OrderItemInput;
    });

    const amount = orderItems.reduce((accumulator: number, item: OrderItemInput) => {
      return accumulator + item.itemPrice * item.itemQuantity;
    }, 0);
    const delivery = amount < 100 ? 5 : 0;
    const session = await mongoose.startSession();

    try {
      let newOrder: Order;
      await session.withTransaction(async () => {
        const createdOrders = await this.orderModel.create(
          [
            {
              orderTotal: amount + delivery,
              orderDelivery: delivery,
              memberId: memberId,
            },
          ],
          { session }
        );
        newOrder = createdOrders[0];

        for (const item of orderItems) {
          const updatedProduct = await ProductModel.findOneAndUpdate(
            {
              _id: item.productId,
              productStatus: ProductStatus.PROCESS,
              productLeftCount: { $gte: item.itemQuantity },
            },
            { $inc: { productLeftCount: -item.itemQuantity } },
            { new: true, session }
          ).exec();

          if (!updatedProduct) {
            throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
          }
        }

        await this.recordOrderItem(newOrder._id, orderItems, session);
      });
      return newOrder!;
    } catch (err) {
      console.log("Error, model:createOrder:", err);
      if (err instanceof Errors) throw err;
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    } finally {
      await session.endSession();
    }
  }

  private async recordOrderItem(
    orderId: ObjectId,
    input: OrderItemInput[],
    session?: mongoose.ClientSession
  ): Promise<void> {
    const promisedList = input.map(async (item: OrderItemInput) => {
      item.orderId = orderId;
      item.productId = shapeIntoMongooseObjectId(item.productId);
      await this.orderItemModel.create([item], { session });
      return "INSERTED";
    });

    const orderItemsState = await Promise.all(promisedList);
    console.log("orderItemsState:", orderItemsState);
  }

  public async getMyOrders(
    member: Member,
    inquiry: OrderInquiry
  ): Promise<Order[]> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    const page = Number.isInteger(inquiry.page) && inquiry.page > 0 ? inquiry.page : 1;
    const limit =
      Number.isInteger(inquiry.limit) && inquiry.limit > 0
        ? Math.min(inquiry.limit, 100)
        : 20;
    const matches: any = { memberId: memberId };
    if (inquiry.orderStatus) matches.orderStatus = inquiry.orderStatus;

    const result = await this.orderModel
      .aggregate([
        { $match: matches },
        { $sort: { updatedAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $lookup: {
            from: "orderItems",
            localField: "_id",
            foreignField: "orderId",
            as: "orderItems",
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "orderItems.productId",
            foreignField: "_id",
            as: "productData",
          },
        },
      ])
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result;
  }

  public async updateAdminOrderStatus(id: string, orderStatus: string): Promise<Order> {
    if (!Object.values(OrderStatus).includes(orderStatus as OrderStatus)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    }
    const orderId = shapeIntoMongooseObjectId(id);
    const result = await this.orderModel
      .findByIdAndUpdate(orderId, { orderStatus }, { new: true })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
    return result;
  }

  public async getAllOrdersForAdmin(): Promise<Order[]> {
    return await this.orderModel
      .aggregate([
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "orderItems",
            localField: "_id",
            foreignField: "orderId",
            as: "orderItems",
          },
        },
        {
          $lookup: {
            from: "members",
            localField: "memberId",
            foreignField: "_id",
            as: "memberData",
          },
        },
        { $unwind: { path: "$memberData", preserveNullAndEmptyArrays: true } },
      ])
      .exec();
  }

  public async updateOrder(
    member: Member,
    input: OrderUpdateInput
  ): Promise<Order> {
    const memberId = shapeIntoMongooseObjectId(member._id),
      orderId = shapeIntoMongooseObjectId(input.orderId),
      orderStatus = input.orderStatus;

    if (![OrderStatus.DELETE].includes(orderStatus)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    }

    const result = await this.orderModel
      .findOneAndUpdate(
        { memberId: memberId, _id: orderId },
        { orderStatus: orderStatus },
        { new: true }
      )
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);

    if (orderStatus === OrderStatus.PROCESS) {
      await this.memberService.addUserPoint(member, 1);
    }

    return result;
  }
}

export default OrderService;
