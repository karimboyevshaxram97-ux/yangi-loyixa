import { MemberStatus, MemberType } from "../libs/types/enums/member.enum";
import { ProductStatus } from "../libs/types/enums/product.enum";
import { InquiryStatus } from "../libs/types/enums/inquiry.enum";
import Errors, { HttpCode, Message } from "../libs/types/errors";
import {
  LoginInput,
  Member,
  MemberInput,
  MemberUpdateInput,
} from "../libs/types/member";
import MemberModel from "../schema/Member.model";
import ProductModel from "../schema/Product.model";
import InquiryModel from "../schema/Inquiry.model";
import OrderModel from "../schema/Order.model";
import * as bcrypt from "bcryptjs";
import * as fs from "fs";
import { shapeIntoMongooseObjectId } from "../libs/types/config";

class MemberService {
  private readonly memberModel;

  constructor() {
    this.memberModel = MemberModel;
  }

  public async getShop(): Promise<Member> {
    const result = await this.memberModel
      .findOne({ memberType: MemberType.TTEOK_SHOP })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result;
  }

  public async Signup(input: MemberInput): Promise<Member> {
    input.memberType = MemberType.USER;
    input.memberStatus = MemberStatus.ACTIVE;
    const salt = await bcrypt.genSalt();
    input.memberPassword = await bcrypt.hash(input.memberPassword, salt);
    try {
      const result = await this.memberModel.create(input);
      result.memberPassword = "";
      return result.toJSON();
    } catch (err) {
      console.error("Error, model:signup", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.USED_NICK_PHONE);
    }
  }

  public async login(input: LoginInput): Promise<Member> {
    const member = await this.memberModel
      .findOne(
        {
          memberNick: input.memberNick,
          memberStatus: { $ne: MemberStatus.DELETE },
        },
        { memberNick: 1, memberPassword: 1, memberStatus: 1 }
      )
      .exec();
    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_MEMBER_NICK);

    if (member.memberStatus === MemberStatus.BLOCK)
      throw new Errors(HttpCode.FORBIDDEN, Message.BLOCKED_USER);

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword
    );
    if (!isMatch)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);

    return await this.memberModel.findById(member._id).lean().exec();
  }

  /** JWT payloadidagi a'zo hali ham mavjud va ACTIVE ekanini DB dan tekshiradi */
  public async ensureActiveMember(memberId: any): Promise<Member> {
    const id = shapeIntoMongooseObjectId(String(memberId));
    const member: any = await this.memberModel.findById(id).lean().exec();
    if (!member)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    if (member.memberStatus !== MemberStatus.ACTIVE)
      throw new Errors(HttpCode.FORBIDDEN, Message.BLOCKED_USER);
    member._id = member._id.toString();
    return member as Member;
  }

  public async getMemberDetail(member: Member): Promise<Member> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    const result = await this.memberModel
      .findOne({ _id: memberId, memberStatus: MemberStatus.ACTIVE })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result;
  }

  public async updateMember(
    member: Member,
    input: MemberUpdateInput
  ): Promise<Member> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    const updateInput: MemberUpdateInput = {} as MemberUpdateInput;
    if (input.memberNick) updateInput.memberNick = input.memberNick;
    if (input.memberPhone) updateInput.memberPhone = input.memberPhone;
    if (input.memberAddress !== undefined) updateInput.memberAddress = input.memberAddress;
    if (input.memberDesc !== undefined) updateInput.memberDesc = input.memberDesc;
    if (input.memberImage) updateInput.memberImage = input.memberImage;

    const result = await this.memberModel
      .findOneAndUpdate(
        {
          _id: memberId,
          memberType: MemberType.USER,
          memberStatus: MemberStatus.ACTIVE,
        },
        updateInput,
        { new: true }
      )
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
    return result;
  }

  public async getTopUsers(): Promise<Member[]> {
    const result = await this.memberModel
      .find({
        memberStatus: MemberStatus.ACTIVE,
        memberPoints: { $gte: 1 },
      })
      .sort({ memberPoints: -1 })
      .limit(4)
      .exec();
    return result;
  }

  public async addUserPoint(member: Member, point: number): Promise<Member> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    return await this.memberModel
      .findOneAndUpdate(
        {
          _id: memberId,
          memberType: MemberType.USER,
          memberStatus: MemberStatus.ACTIVE,
        },
        { $inc: { memberPoints: point } },
        { new: true }
      )
      .exec();
  }

  public async processSignup(input: MemberInput): Promise<Member> {
    // Check if a shop already exists
    const existingShop = await this.memberModel
      .findOne({ memberType: MemberType.TTEOK_SHOP })
      .exec();
    if (existingShop) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.SHOP_ALREADY_EXISTS);
    }

    const salt = await bcrypt.genSalt();
    input.memberPassword = await bcrypt.hash(input.memberPassword, salt);
    input.memberType = MemberType.TTEOK_SHOP;
    input.memberStatus = MemberStatus.ACTIVE;
    
    try {
      const result = await this.memberModel.create(input);
      result.memberPassword = "";
      const jsonResult = result.toJSON();
      jsonResult._id = jsonResult._id.toString();
      return jsonResult;
    } catch (err: any) {
      console.log("Error, processSignup:", err);
      if (err.code === 11000) {
        throw new Errors(HttpCode.BAD_REQUEST, Message.USED_NICK_PHONE);
      }
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async processLogin(input: LoginInput): Promise<Member> {
    const member = await this.memberModel
      .findOne(
        { memberNick: input.memberNick, memberType: MemberType.TTEOK_SHOP },
        { memberNick: 1, memberPassword: 1, memberStatus: 1 }
      )
      .exec();
    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_MEMBER_NICK);

    if (member.memberStatus === MemberStatus.DELETE)
      throw new Errors(HttpCode.FORBIDDEN, Message.BLOCKED_USER);
    if (member.memberStatus === MemberStatus.BLOCK)
      throw new Errors(HttpCode.FORBIDDEN, Message.BLOCKED_USER);

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword
    );
    if (!isMatch)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);

    const result = await this.memberModel.findById(member._id).lean().exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_MEMBER_NICK);
    result._id = result._id.toString();
    return result;
  }

  public async getUsers(): Promise<Member[]> {
    const result = await this.memberModel
      .find({ memberType: MemberType.USER })
      .exec();
    return result;
  }

  public async updateChosenUser(input: MemberUpdateInput): Promise<Member> {
    if (!Object.values(MemberStatus).includes(input.memberStatus as MemberStatus)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    }
    input._id = shapeIntoMongooseObjectId(input._id);
    const result = await this.memberModel
      .findOneAndUpdate(
        { _id: input._id, memberType: MemberType.USER },
        { memberStatus: input.memberStatus },
        { new: true }
      )
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
    return result;
  }

  public async updateShopImagePath(imagePath: string): Promise<void> {
    await this.memberModel
      .findOneAndUpdate(
        { memberType: MemberType.TTEOK_SHOP },
        { memberImage: imagePath }
      )
      .exec();
  }

  public async clearShopImage(): Promise<void> {
    const shop = await this.memberModel
      .findOne({ memberType: MemberType.TTEOK_SHOP })
      .exec();
    if (!shop || !shop.memberImage) return;

    const imagePath = shop.memberImage;
    await this.memberModel
      .findByIdAndUpdate(shop._id, { $unset: { memberImage: "" } })
      .exec();

    try {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    } catch (err) {
      console.log("Warning: could not delete image file:", err);
    }
  }

  public async getDashboardStats(): Promise<{
    products: number;
    members: number;
    pendingInquiries: number;
    orders: number;
  }> {
    const [products, members, pendingInquiries, orders] = await Promise.all([
      ProductModel.countDocuments({ productStatus: ProductStatus.PROCESS }),
      this.memberModel.countDocuments({ memberType: { $ne: MemberType.TTEOK_SHOP } }),
      InquiryModel.countDocuments({ status: InquiryStatus.PENDING }),
      OrderModel.countDocuments(),
    ]);
    return { products, members, pendingInquiries, orders };
  }
}

export default MemberService;
