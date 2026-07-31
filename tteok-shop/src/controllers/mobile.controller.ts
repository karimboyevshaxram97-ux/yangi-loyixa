import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { T } from "../libs/types/common";
import Errors, { HttpCode, Message } from "../libs/types/errors";
import MemberService from "../models/Member.service";
import AuthService from "../models/Auth.service";
import ProductService from "../models/Product.service";
import OrderService from "../models/Order.service";
import PaymentService from "../models/Payment.service";
import InquiryService from "../models/Inquiry.service";
import { LoginInput, MemberInput, MemberUpdateInput } from "../libs/types/member";
import { ProductInquiry } from "../libs/types/product";
import { OrderInquiry } from "../libs/types/order";
import { OrderStatus } from "../libs/types/enums/order.enum";
import {
  PaymentInput,
  CreditCardInput,
  PaymentConfirmInput,
} from "../libs/types/payment";
import { PaymentMethod } from "../libs/types/enums/payment.enum";
import {
  apiOk,
  apiFail,
  asyncHandler,
  buildPagination,
  requireFields,
} from "../libs/types/utils/apiResponse";
import { removeUploadedFiles } from "../libs/types/utils/uploader";

const memberService = new MemberService();
const authService = new AuthService();
const productService = new ProductService();
const orderService = new OrderService();
const paymentService = new PaymentService();
const inquiryService = new InquiryService();

const mobileController: T = {};

/** ======================= Middleware ======================= **/

const extractBearerToken = (req: any): string | null => {
  const header = req.headers?.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
};

/** Majburiy Bearer auth: token yo'q/xato bo'lsa 401, a'zo aktiv emasligi ham tekshiriladi */
mobileController.verifyBearer = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractBearerToken(req);
    if (!token)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);

    let payload;
    try {
      payload = await authService.checkAuth(token);
    } catch (jwtErr: any) {
      // Muddati tugagan tokenni alohida ajratamiz — mijoz refresh qilishi kerakligini biladi
      if (jwtErr?.name === "TokenExpiredError")
        throw new Errors(HttpCode.UNAUTHORIZED, Message.TOKEN_EXPIRED);
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    }

    req.member = await memberService.ensureActiveMember(payload._id);
    next();
  } catch (err) {
    console.log("Error, mobile:verifyBearer:", err);
    apiFail(res, err);
  }
};

/** Ixtiyoriy Bearer auth: token bo'lsa member biriktiriladi, bo'lmasa mehmon sifatida davom etadi */
mobileController.retrieveBearer = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractBearerToken(req);
    if (token) {
      const payload = await authService.checkAuth(token);
      req.member = await memberService.ensureActiveMember(payload._id);
    }
  } catch (err) {
    // Mehmon rejimi — auth xatosi jim yutiladi
  }
  next();
};

/** ======================= Health ======================= **/

mobileController.health = asyncHandler("mobile:health", async (req, res) => {
  apiOk(res, {
    status: "ok",
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    // 1 = connected — mobil ilova serverni monitoring qilishi uchun
    dbConnected: mongoose.connection.readyState === 1,
    version: "v1",
  });
});

/** ======================= Auth ======================= **/

const issueTokenPair = async (req: any, member: any) => {
  const accessToken = await authService.createAccessToken(member);
  const refreshToken = await authService.issueRefreshToken(
    member._id,
    req.headers?.["user-agent"] ?? ""
  );
  return { accessToken, refreshToken };
};

mobileController.signup = asyncHandler("mobile:signup", async (req, res) => {
  requireFields(req.body, ["memberNick", "memberPhone", "memberPassword"]);
  if (String(req.body.memberPassword).length < 4)
    throw new Errors(HttpCode.BAD_REQUEST, Message.VALIDATION_FAILED);

  const input: MemberInput = req.body;
  if (req.file) input.memberImage = req.file.path.replace(/\\/g, "/");

  let member;
  try {
    member = await memberService.Signup(input);
  } catch (err) {
    removeUploadedFiles(req.file);
    throw err;
  }

  const tokens = await issueTokenPair(req, member);
  apiOk(res, { member, ...tokens }, HttpCode.CREATED);
});

mobileController.login = asyncHandler("mobile:login", async (req, res) => {
  requireFields(req.body, ["memberNick", "memberPassword"]);
  const input: LoginInput = req.body;
  const member = await memberService.login(input);
  const tokens = await issueTokenPair(req, member);
  apiOk(res, { member, ...tokens });
});

mobileController.refresh = asyncHandler("mobile:refresh", async (req, res) => {
  requireFields(req.body, ["refreshToken"]);
  const rotated = await authService.rotateRefreshToken(
    req.body.refreshToken,
    req.headers?.["user-agent"] ?? ""
  );
  // Rotatsiyadan keyin ham a'zo hali aktivligini tekshiramiz
  const member = await memberService.ensureActiveMember(rotated.memberId);
  const accessToken = await authService.createAccessToken(member);
  apiOk(res, { accessToken, refreshToken: rotated.refreshToken });
});

mobileController.logout = asyncHandler("mobile:logout", async (req, res) => {
  await authService.revokeRefreshToken(req.body?.refreshToken ?? "");
  apiOk(res, { message: "Logged out!" });
});

mobileController.me = asyncHandler("mobile:me", async (req, res) => {
  const member = await memberService.getMemberDetail(req.member);
  apiOk(res, member);
});

/** ======================= Members ======================= **/

mobileController.updateMe = asyncHandler("mobile:updateMe", async (req, res) => {
  const input: MemberUpdateInput = req.body;
  if (req.file) input.memberImage = req.file.path.replace(/\\/g, "/");

  try {
    const member = await memberService.updateMember(req.member, input);
    apiOk(res, member);
  } catch (err) {
    removeUploadedFiles(req.file);
    throw err;
  }
});

mobileController.getShop = asyncHandler("mobile:getShop", async (req, res) => {
  const shop = await memberService.getShop();
  apiOk(res, shop);
});

mobileController.getTopUsers = asyncHandler(
  "mobile:getTopUsers",
  async (req, res) => {
    const users = await memberService.getTopUsers();
    apiOk(res, users);
  }
);

/** ======================= Products ======================= **/

mobileController.getProducts = asyncHandler(
  "mobile:getProducts",
  async (req, res) => {
    const { page, limit, order, productCollection, search } = req.query;
    const inquiry: ProductInquiry = {
      order: typeof order === "string" ? order : "createdAt",
      page: Number(page) > 0 ? Math.floor(Number(page)) : 1,
      limit: Number(limit) > 0 ? Math.min(Math.floor(Number(limit)), 100) : 20,
    };
    if (productCollection) inquiry.productCollection = productCollection;
    if (typeof search === "string" && search.trim()) inquiry.search = search.trim();

    const [list, total] = await Promise.all([
      productService.getProducts(inquiry),
      productService.countProducts(inquiry),
    ]);

    apiOk(res, {
      list,
      pagination: buildPagination(inquiry.page, inquiry.limit, total),
    });
  }
);

mobileController.getProduct = asyncHandler(
  "mobile:getProduct",
  async (req, res) => {
    const memberId = req.member?._id ?? null;
    const product = await productService.getProduct(memberId, req.params.id);
    apiOk(res, product);
  }
);

mobileController.likeProduct = asyncHandler(
  "mobile:likeProduct",
  async (req, res) => {
    const productLikes = await productService.likeProduct(
      req.member._id,
      req.params.id
    );
    apiOk(res, { productLikes });
  }
);

/** ======================= Orders ======================= **/

mobileController.createOrder = asyncHandler(
  "mobile:createOrder",
  async (req, res) => {
    // Mobil mijoz { items: [...] } yoki to'g'ridan-to'g'ri massiv yuborishi mumkin
    const items = Array.isArray(req.body) ? req.body : req.body?.items;
    if (!Array.isArray(items) || items.length === 0)
      throw new Errors(HttpCode.BAD_REQUEST, Message.VALIDATION_FAILED);

    const order = await orderService.createOrder(req.member, items);
    apiOk(res, order, HttpCode.CREATED);
  }
);

mobileController.getMyOrders = asyncHandler(
  "mobile:getMyOrders",
  async (req, res) => {
    const { page, limit, orderStatus } = req.query;
    const status =
      typeof orderStatus === "string" &&
      Object.values(OrderStatus).includes(orderStatus as OrderStatus)
        ? (orderStatus as OrderStatus)
        : undefined;

    const inquiry: OrderInquiry = {
      page: Number(page) > 0 ? Math.floor(Number(page)) : 1,
      limit: Number(limit) > 0 ? Math.min(Math.floor(Number(limit)), 100) : 20,
      orderStatus: status as OrderStatus,
    };

    const [list, total] = await Promise.all([
      orderService.getMyOrders(req.member, inquiry),
      orderService.countMyOrders(req.member, inquiry),
    ]);

    apiOk(res, {
      list,
      pagination: buildPagination(inquiry.page, inquiry.limit, total),
    });
  }
);

mobileController.cancelOrder = asyncHandler(
  "mobile:cancelOrder",
  async (req, res) => {
    const order = await orderService.updateOrder(req.member, {
      orderId: req.params.id,
      orderStatus: OrderStatus.DELETE,
    });
    apiOk(res, order);
  }
);

/** ======================= Payments ======================= **/

const parsePaymentInput = (body: any): PaymentInput => {
  requireFields(body, ["orderId", "amount"]);
  return { orderId: String(body.orderId), amount: Number(body.amount) };
};

mobileController.payKakaoReady = asyncHandler(
  "mobile:payKakaoReady",
  async (req, res) => {
    const input = parsePaymentInput(req.body);
    const result = await paymentService.initiateKakaoPay(req.member, input);
    // Mobil ilova next_redirect_mobile_url ni WebView/browser da ochadi
    apiOk(res, result);
  }
);

mobileController.paySamsungReady = asyncHandler(
  "mobile:paySamsungReady",
  async (req, res) => {
    const input = parsePaymentInput(req.body);
    const result = await paymentService.initiateSamsungPay(req.member, input);
    apiOk(res, result);
  }
);

mobileController.payAppleReady = asyncHandler(
  "mobile:payAppleReady",
  async (req, res) => {
    const input = parsePaymentInput(req.body);
    const result = await paymentService.initiateApplePay(req.member, input);
    apiOk(res, result);
  }
);

mobileController.payCreditReady = asyncHandler(
  "mobile:payCreditReady",
  async (req, res) => {
    const base = parsePaymentInput(req.body);
    const input: CreditCardInput = { ...base, cardInfo: req.body.cardInfo };
    const result = await paymentService.initiateCreditCard(req.member, input);
    apiOk(res, result);
  }
);

mobileController.confirmPayment = asyncHandler(
  "mobile:confirmPayment",
  async (req, res) => {
    requireFields(req.body, ["transactionId"]);
    const input: PaymentConfirmInput = {
      transactionId: String(req.body.transactionId),
      paymentMethod: req.body.paymentMethod as PaymentMethod,
      pgToken: req.body.pgToken ? String(req.body.pgToken) : undefined,
    };
    const payment = await paymentService.confirmPayment(req.member, input);
    apiOk(res, payment);
  }
);

mobileController.refundPayment = asyncHandler(
  "mobile:refundPayment",
  async (req, res) => {
    requireFields(req.body, ["transactionId"]);
    const payment = await paymentService.refundPayment(req.member, {
      transactionId: String(req.body.transactionId),
    });
    apiOk(res, payment);
  }
);

/** ======================= Inquiries ======================= **/

mobileController.createInquiry = asyncHandler(
  "mobile:createInquiry",
  async (req, res) => {
    requireFields(req.body, ["name", "email", "message"]);
    // Minimal email formati tekshiruvi — spam va xato kiritishlarni kamaytiradi
    if (!/^\S+@\S+\.\S+$/.test(String(req.body.email)))
      throw new Errors(HttpCode.BAD_REQUEST, Message.VALIDATION_FAILED);

    const inquiry = await inquiryService.createInquiry({
      name: String(req.body.name).slice(0, 100),
      email: String(req.body.email).slice(0, 200),
      phone: req.body.phone ? String(req.body.phone).slice(0, 30) : undefined,
      message: String(req.body.message).slice(0, 2000),
    });
    apiOk(res, inquiry, HttpCode.CREATED);
  }
);

export default mobileController;
