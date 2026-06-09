import { ObjectId } from "mongoose";
import { PaymentMethod, PaymentStatus } from "./enums/payment.enum";

export interface Payment {
  _id: ObjectId;
  orderId: ObjectId;
  memberId: ObjectId;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  transactionId?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentInput {
  orderId: string;
  amount: number;
}

export interface CardInfo {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardHolderName: string;
}

export interface CreditCardInput extends PaymentInput {
  cardInfo: CardInfo;
}

export interface PaymentConfirmInput {
  transactionId: string;
  paymentMethod: PaymentMethod;
  pgToken?: string;
}

export interface PaymentRefundInput {
  transactionId: string;
}

// KakaoPay API response shapes
export interface KakaoPayReadyResponse {
  tid: string;
  next_redirect_pc_url: string;
  next_redirect_mobile_url: string;
  next_redirect_app_url: string;
  created_at: string;
}

export interface KakaoPayApproveResponse {
  tid: string;
  aid: string;
  cid: string;
  partner_order_id: string;
  partner_user_id: string;
  payment_method_type: string;
  amount: {
    total: number;
    tax_free: number;
    vat: number;
    point: number;
    discount: number;
  };
  item_name: string;
  quantity: number;
  created_at: string;
  approved_at: string;
}

export interface KakaoPayCancelResponse {
  tid: string;
  status: string;
  amount: {
    total: number;
    tax_free: number;
    vat: number;
    point: number;
    discount: number;
  };
  approved_cancel_amount: {
    total: number;
    tax_free: number;
    vat: number;
    point: number;
    discount: number;
  };
  canceled_at: string;
}
