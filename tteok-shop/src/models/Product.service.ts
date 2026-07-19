import Errors, { HttpCode, Message } from "../libs/types/errors";
import {
  Product,
  ProductInput,
  ProductInquiry,
  ProductUpdateInput,
} from "../libs/types/product";
import ProductModel from "../schema/Product.model";
import { shapeIntoMongooseObjectId } from "../libs/types/config";
import { ProductCollection, ProductSize, ProductStatus, ProductVolume } from "../libs/types/enums/product.enum";
import { ObjectId } from "mongoose";
import ViewService from "./View.service";
import { ViewInput } from "../libs/types/view";
import { ViewGroup } from "../libs/types/enums/view.enum";

class ProductService {
  private readonly productModel;
  public viewService;

  constructor() {
    this.productModel = ProductModel;
    this.viewService = new ViewService();
  }

  public async getProducts(inquiry: ProductInquiry): Promise<Product[]> {
    const match: any = { productStatus: ProductStatus.PROCESS };
    const allowedSortFields = new Set([
      "createdAt",
      "updatedAt",
      "productPrice",
      "productViews",
      "productName",
    ]);
    const orderField = allowedSortFields.has(inquiry.order)
      ? inquiry.order
      : "createdAt";
    const page = Number.isInteger(inquiry.page) && inquiry.page > 0 ? inquiry.page : 1;
    const limit =
      Number.isInteger(inquiry.limit) && inquiry.limit > 0
        ? Math.min(inquiry.limit, 100)
        : 20;

    if (inquiry.productCollection) {
      match.productCollection = inquiry.productCollection;
    }
    if (inquiry.search) {
      const escapedSearch = inquiry.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      match.productName = { $regex: new RegExp(escapedSearch, "i") };
    }

    const sort: any =
      orderField === "productPrice" || orderField === "productName"
        ? { [orderField]: 1 }
        : { [orderField]: -1 };

    const result = await this.productModel
      .aggregate([
        { $match: match },
        { $sort: sort },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ])
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result;
  }

  public async getProduct(
    memberId: ObjectId | null,
    id: string
  ): Promise<Product> {
    const productId = shapeIntoMongooseObjectId(id);

    let result = await this.productModel
      .findOne({ _id: productId, productStatus: ProductStatus.PROCESS })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    if (memberId) {
      const input: ViewInput = {
        memberId: memberId,
        viewRefId: productId,
        viewGroup: ViewGroup.PRODUCT,
      };
      const existView = await this.viewService.checkViewExistence(input);
      if (!existView) {
        await this.viewService.insertMemberView(input);
        result = await this.productModel
          .findByIdAndUpdate(
            productId,
            { $inc: { productViews: +1 } },
            { new: true }
          )
          .exec();
      }
    }
    return result;
  }

  public async likeProduct(id: string): Promise<number> {
    const productId = shapeIntoMongooseObjectId(id);
    const result = await this.productModel
      .findByIdAndUpdate(productId, { $inc: { productViews: 1 } }, { new: true })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result.productViews;
  }

  public async getAllProducts(): Promise<Product[]> {
    const result = await this.productModel.find().exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result;
  }

  public async createNewProduct(input: ProductInput): Promise<Product> {
    if (
      !Object.values(ProductCollection).includes(input.productCollection) ||
      !input.productName ||
      Number(input.productPrice) <= 0 ||
      Number(input.productLeftCount) < 0 ||
      !input.productDesc
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }

    input.productPrice = Number(input.productPrice);
    input.productLeftCount = Number(input.productLeftCount);
    if (input.productSize && !Object.values(ProductSize).includes(input.productSize)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
    if (
      input.productVolume &&
      !Object.values(ProductVolume).includes(Number(input.productVolume))
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
    if (input.productVolume) input.productVolume = Number(input.productVolume);

    try {
      return await this.productModel.create(input);
    } catch (err) {
      console.error("Error, model:createNewProduct:", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async updateChosenProduct(
    id: string,
    input: ProductUpdateInput
  ): Promise<Product> {
    if (
      input.productStatus &&
      !Object.values(ProductStatus).includes(input.productStatus)
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    }
    id = shapeIntoMongooseObjectId(id);
    const result = await this.productModel
      .findOneAndUpdate(
        { _id: id },
        { productStatus: input.productStatus },
        { new: true }
      )
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
    return result;
  }
}

export default ProductService;
