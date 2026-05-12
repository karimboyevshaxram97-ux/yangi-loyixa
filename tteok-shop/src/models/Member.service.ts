import { MemberStatus, MemberType } from "../libs/types/enums/member.enum";
import Errors, { HttpCode, Message } from "../libs/types/errors";
import {
  LoginInput,
  Member,
  MemberInput,
  MemberUpdateInput,
} from "../libs/types/member";
import MemberModel from "../schema/Member.model";
import * as bcrypt from "bcryptjs";
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

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword
    );
    if (!isMatch)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);

    return await this.memberModel.findById(member._id).lean().exec();
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
    const result = await this.memberModel
      .findOneAndUpdate({ _id: memberId }, input, { new: true })
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
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
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
    input._id = shapeIntoMongooseObjectId(input._id);
    const result = await this.memberModel
      .findByIdAndUpdate({ _id: input._id }, input, { new: true })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
    return result;
  }
}

export default MemberService;