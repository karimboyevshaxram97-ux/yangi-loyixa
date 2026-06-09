import mongoose, { Schema } from "mongoose";
import { PaymentMethod, PaymentStatus } from "../libs/types/enums/payment.enum";

const paymentSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Order",
    },
    memberId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Member",
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "KRW",
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, collection: "payments" }
);

export default mongoose.model("Payment", paymentSchema);
