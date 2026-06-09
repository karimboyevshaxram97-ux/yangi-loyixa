import { Request, Response } from "express";
import { T } from "../libs/types/common";
import Errors, { HttpCode } from "../libs/types/errors";
import PaymentService from "../models/Payment.service";
import {
  PaymentInput,
  CreditCardInput,
  PaymentConfirmInput,
  PaymentRefundInput,
} from "../libs/types/payment";
import { PaymentMethod } from "../libs/types/enums/payment.enum";

const paymentService = new PaymentService();
const paymentController: T = {};

/** POST /payment/kakao/ready **/
paymentController.initiateKakaoPay = async (req: any, res: Response) => {
  try {
    console.log("initiateKakaoPay");
    const input: PaymentInput = req.body;
    const result = await paymentService.initiateKakaoPay(req.member, input);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, initiateKakaoPay:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** POST /payment/samsung/ready **/
paymentController.initiateSamsungPay = async (req: any, res: Response) => {
  try {
    console.log("initiateSamsungPay");
    const input: PaymentInput = req.body;
    const result = await paymentService.initiateSamsungPay(req.member, input);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, initiateSamsungPay:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** POST /payment/apple/ready **/
paymentController.initiateApplePay = async (req: any, res: Response) => {
  try {
    console.log("initiateApplePay");
    const input: PaymentInput = req.body;
    const result = await paymentService.initiateApplePay(req.member, input);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, initiateApplePay:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** POST /payment/credit/ready **/
paymentController.initiateCreditCard = async (req: any, res: Response) => {
  try {
    console.log("initiateCreditCard");
    const input: CreditCardInput = req.body;
    const result = await paymentService.initiateCreditCard(req.member, input);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, initiateCreditCard:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** POST /payment/confirm **/
paymentController.confirmPayment = async (req: Request, res: Response) => {
  try {
    console.log("confirmPayment");
    const input: PaymentConfirmInput = {
      transactionId: req.body.transactionId,
      paymentMethod: req.body.paymentMethod as PaymentMethod,
      pgToken: req.body.pgToken,
    };
    const result = await paymentService.confirmPayment(input);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, confirmPayment:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** POST /payment/refund **/
paymentController.refundPayment = async (req: Request, res: Response) => {
  try {
    console.log("refundPayment");
    const input: PaymentRefundInput = { transactionId: req.body.transactionId };
    const result = await paymentService.refundPayment(input);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, refundPayment:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default paymentController;
