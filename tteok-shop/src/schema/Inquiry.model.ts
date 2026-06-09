import mongoose, { Schema } from "mongoose";
import { InquiryStatus } from "../libs/types/enums/inquiry.enum";

const inquirySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(InquiryStatus),
      default: InquiryStatus.PENDING,
    },
    reply: {
      type: String,
      default: null,
    },
    repliedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, collection: "inquiries" }
);

export default mongoose.model("Inquiry", inquirySchema);
