import { ObjectId } from "mongoose";
import { InquiryStatus } from "./enums/inquiry.enum";

export interface Inquiry {
  _id: ObjectId;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: InquiryStatus;
  reply?: string;
  repliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InquiryInput {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export interface InquiryReplyInput {
  inquiryId: string;
  reply: string;
}
