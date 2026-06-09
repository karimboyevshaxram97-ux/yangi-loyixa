import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import PaymentModel from "../schema/Payment.model";
import { Member } from "../libs/types/member";
import {
  Payment,
  PaymentInput,
  CreditCardInput,
  PaymentConfirmInput,
  PaymentRefundInput,
  KakaoPayReadyResponse,
  KakaoPayApproveResponse,
  KakaoPayCancelResponse,
} from "../libs/types/payment";
import { PaymentMethod, PaymentStatus } from "../libs/types/enums/payment.enum";
import { shapeIntoMongooseObjectId } from "../libs/types/config";
import Errors, { HttpCode, Message } from "../libs/types/errors";

class PaymentService {
  private readonly paymentModel;

  constructor() {
    this.paymentModel = PaymentModel;
  }

  /** KakaoPay **/
  public async initiateKakaoPay(
    member: Member,
    input: PaymentInput
  ): Promise<{ nextRedirectPcUrl: string; nextRedirectMobileUrl: string; tid: string }> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    let orderId;
    try {
      orderId = shapeIntoMongooseObjectId(input.orderId);
    } catch (_) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.PAYMENT_FAILED);
    }

    const payment = await this.paymentModel.create({
      orderId,
      memberId,
      paymentMethod: PaymentMethod.KAKAO,
      paymentStatus: PaymentStatus.PENDING,
      amount: input.amount,
      currency: "KRW",
    });

    try {
      const response = await axios.post<KakaoPayReadyResponse>(
        "https://open-api.kakaopay.com/online/v1/payment/ready",
        {
          cid: process.env.KAKAO_PAY_CID,
          partner_order_id: input.orderId,
          partner_user_id: String(member._id),
          item_name: "떡 상품",
          quantity: 1,
          total_amount: input.amount,
          tax_free_amount: 0,
          approval_url: `${process.env.APP_URL}/payment/kakao/success?paymentId=${payment._id}`,
          fail_url: `${process.env.APP_URL}/payment/kakao/fail?paymentId=${payment._id}`,
          cancel_url: `${process.env.APP_URL}/payment/kakao/cancel?paymentId=${payment._id}`,
        },
        {
          headers: {
            Authorization: `SECRET_KEY ${process.env.KAKAO_PAY_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      await this.paymentModel.findByIdAndUpdate(payment._id, {
        transactionId: response.data.tid,
      });

      return {
        nextRedirectPcUrl: response.data.next_redirect_pc_url,
        nextRedirectMobileUrl: response.data.next_redirect_mobile_url,
        tid: response.data.tid,
      };
    } catch (err) {
      await this.paymentModel.findByIdAndUpdate(payment._id, {
        paymentStatus: PaymentStatus.FAILED,
      });
      console.log("Error, KakaoPay ready:", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.KAKAO_PAY_ERROR);
    }
  }

  /** Samsung Pay **/
  public async initiateSamsungPay(
    member: Member,
    input: PaymentInput
  ): Promise<{ transactionId: string; paymentUrl: string; serviceId: string }> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    let orderId;
    try {
      orderId = shapeIntoMongooseObjectId(input.orderId);
    } catch (_) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.PAYMENT_FAILED);
    }
    const transactionId = `SAMSUNG_${uuidv4()}`;

    try {
      await this.paymentModel.create({
        orderId,
        memberId,
        paymentMethod: PaymentMethod.SAMSUNG,
        paymentStatus: PaymentStatus.PENDING,
        amount: input.amount,
        currency: "KRW",
        transactionId,
      });

      // Samsung Pay merchant integration (replace with actual Samsung Pay SDK call)
      const paymentUrl = `https://api.samsungpay.com/v2/checkout?serviceId=${process.env.SAMSUNG_PAY_SERVICE_ID}&orderId=${input.orderId}&amount=${input.amount}&transactionId=${transactionId}`;

      return {
        transactionId,
        paymentUrl,
        serviceId: process.env.SAMSUNG_PAY_SERVICE_ID as string,
      };
    } catch (err) {
      console.log("Error, Samsung Pay initiate:", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.PAYMENT_FAILED);
    }
  }

  /** Apple Pay **/
  public async initiateApplePay(
    member: Member,
    input: PaymentInput
  ): Promise<{ transactionId: string; merchantSession: object }> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    let orderId;
    try {
      orderId = shapeIntoMongooseObjectId(input.orderId);
    } catch (_) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.PAYMENT_FAILED);
    }
    const transactionId = `APPLE_${uuidv4()}`;

    try {
      await this.paymentModel.create({
        orderId,
        memberId,
        paymentMethod: PaymentMethod.APPLE,
        paymentStatus: PaymentStatus.PENDING,
        amount: input.amount,
        currency: "KRW",
        transactionId,
      });

      // Apple Pay merchant session (replace with actual Apple Pay merchant validation)
      const merchantSession = {
        merchantIdentifier: process.env.APPLE_PAY_MERCHANT_ID,
        displayName: "떡 Shop",
        initiative: "web",
        initiativeContext: process.env.APP_URL,
        transactionId,
      };

      return { transactionId, merchantSession };
    } catch (err) {
      console.log("Error, Apple Pay initiate:", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.PAYMENT_FAILED);
    }
  }

  /** Credit Card **/
  public async initiateCreditCard(
    member: Member,
    input: CreditCardInput
  ): Promise<{ transactionId: string; status: PaymentStatus }> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    let orderId;
    try {
      orderId = shapeIntoMongooseObjectId(input.orderId);
    } catch (_) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.PAYMENT_FAILED);
    }
    const transactionId = `CARD_${uuidv4()}`;

    try {
      await this.paymentModel.create({
        orderId,
        memberId,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.PENDING,
        amount: input.amount,
        currency: "KRW",
        transactionId,
      });

      // Credit card processing (integrate with PG like KG Inicis, NicePay, etc.)
      // For now returns a pending status awaiting confirm call
      return { transactionId, status: PaymentStatus.PENDING };
    } catch (err) {
      console.log("Error, Credit Card initiate:", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.PAYMENT_FAILED);
    }
  }

  /** Confirm Payment **/
  public async confirmPayment(input: PaymentConfirmInput): Promise<Payment> {
    const existingPayment = await this.paymentModel
      .findOne({ transactionId: input.transactionId })
      .exec();

    if (!existingPayment)
      throw new Errors(HttpCode.NOT_FOUND, Message.PAYMENT_NOT_FOUND);

    if (existingPayment.paymentStatus === PaymentStatus.SUCCESS)
      throw new Errors(HttpCode.BAD_REQUEST, Message.PAYMENT_ALREADY_PROCESSED);

    try {
      if (existingPayment.paymentMethod === PaymentMethod.KAKAO) {
        if (!input.pgToken)
          throw new Errors(HttpCode.BAD_REQUEST, Message.PAYMENT_FAILED);

        const response = await axios.post<KakaoPayApproveResponse>(
          "https://open-api.kakaopay.com/online/v1/payment/approve",
          {
            cid: process.env.KAKAO_PAY_CID,
            tid: input.transactionId,
            partner_order_id: String(existingPayment.orderId),
            partner_user_id: String(existingPayment.memberId),
            pg_token: input.pgToken,
          },
          {
            headers: {
              Authorization: `SECRET_KEY ${process.env.KAKAO_PAY_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        const updatedPayment = await this.paymentModel
          .findOneAndUpdate(
            { transactionId: input.transactionId },
            {
              paymentStatus: PaymentStatus.SUCCESS,
              paidAt: new Date(response.data.approved_at),
            },
            { new: true }
          )
          .exec();

        if (!updatedPayment)
          throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);

        return updatedPayment as unknown as Payment;
      }

      // Samsung Pay, Apple Pay, Credit Card confirmation
      const updatedPayment = await this.paymentModel
        .findOneAndUpdate(
          { transactionId: input.transactionId },
          {
            paymentStatus: PaymentStatus.SUCCESS,
            paidAt: new Date(),
          },
          { new: true }
        )
        .exec();

      if (!updatedPayment)
        throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);

      return updatedPayment as unknown as Payment;
    } catch (err) {
      if (err instanceof Errors) throw err;
      console.log("Error, confirmPayment:", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.PAYMENT_FAILED);
    }
  }

  /** Refund Payment **/
  public async refundPayment(input: PaymentRefundInput): Promise<Payment> {
    const existingPayment = await this.paymentModel
      .findOne({ transactionId: input.transactionId })
      .exec();

    if (!existingPayment)
      throw new Errors(HttpCode.NOT_FOUND, Message.PAYMENT_NOT_FOUND);

    if (existingPayment.paymentStatus !== PaymentStatus.SUCCESS)
      throw new Errors(HttpCode.BAD_REQUEST, Message.REFUND_FAILED);

    try {
      if (existingPayment.paymentMethod === PaymentMethod.KAKAO) {
        await axios.post<KakaoPayCancelResponse>(
          "https://open-api.kakaopay.com/online/v1/payment/cancel",
          {
            cid: process.env.KAKAO_PAY_CID,
            tid: input.transactionId,
            cancel_amount: existingPayment.amount,
            cancel_tax_free_amount: 0,
          },
          {
            headers: {
              Authorization: `SECRET_KEY ${process.env.KAKAO_PAY_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Samsung Pay, Apple Pay, Credit Card refund via respective PG APIs
      const updatedPayment = await this.paymentModel
        .findOneAndUpdate(
          { transactionId: input.transactionId },
          { paymentStatus: PaymentStatus.REFUNDED },
          { new: true }
        )
        .exec();

      if (!updatedPayment)
        throw new Errors(HttpCode.NOT_MODIFIED, Message.REFUND_FAILED);

      return updatedPayment as unknown as Payment;
    } catch (err) {
      if (err instanceof Errors) throw err;
      console.log("Error, refundPayment:", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.REFUND_FAILED);
    }
  }
}

export default PaymentService;
