import express from "express";
import mobileController from "./controllers/mobile.controller";
import makeUploader from "./libs/types/utils/uploader";
import { rateLimiter } from "./libs/types/utils/rateLimiter";

/**
 * Mobil REST API — /api/v1 prefiksi bilan ulanadi (app.ts).
 * Autentifikatsiya: Authorization: Bearer <accessToken> header orqali
 * (cookie ishlatilmaydi — mobil ilovalar uchun standart yondashuv).
 * Barcha javoblar { success, data | error } konvertida qaytadi.
 */
const routerMobile = express.Router();

// Brute-force himoyasi: 15 daqiqada bitta IP dan ko'pi bilan 10 ta urinish
const authLimiter = rateLimiter(15 * 60 * 1000, 10);
// Spam himoyasi: 1 soatda bitta IP dan ko'pi bilan 5 ta murojaat
const inquiryLimiter = rateLimiter(60 * 60 * 1000, 5);

/** Health **/
routerMobile.get("/health", mobileController.health);

/** Auth **/
routerMobile.post(
  "/auth/signup",
  authLimiter,
  makeUploader("members").single("memberImage"),
  mobileController.signup
);
routerMobile.post("/auth/login", authLimiter, mobileController.login);
routerMobile.post("/auth/refresh", authLimiter, mobileController.refresh);
routerMobile.post("/auth/logout", mobileController.logout);
routerMobile.get("/auth/me", mobileController.verifyBearer, mobileController.me);

/** Members **/
routerMobile.patch(
  "/members/me",
  mobileController.verifyBearer,
  makeUploader("members").single("memberImage"),
  mobileController.updateMe
);
routerMobile.get("/members/top", mobileController.getTopUsers);

/** Shop **/
routerMobile.get("/shop", mobileController.getShop);

/** Products **/
routerMobile.get("/products", mobileController.getProducts);
routerMobile.get(
  "/products/:id",
  mobileController.retrieveBearer,
  mobileController.getProduct
);
routerMobile.post(
  "/products/:id/like",
  mobileController.verifyBearer,
  mobileController.likeProduct
);

/** Orders **/
routerMobile.post(
  "/orders",
  mobileController.verifyBearer,
  mobileController.createOrder
);
routerMobile.get(
  "/orders",
  mobileController.verifyBearer,
  mobileController.getMyOrders
);
routerMobile.patch(
  "/orders/:id/cancel",
  mobileController.verifyBearer,
  mobileController.cancelOrder
);

/** Payments **/
routerMobile.post(
  "/payments/kakao/ready",
  mobileController.verifyBearer,
  mobileController.payKakaoReady
);
routerMobile.post(
  "/payments/samsung/ready",
  mobileController.verifyBearer,
  mobileController.paySamsungReady
);
routerMobile.post(
  "/payments/apple/ready",
  mobileController.verifyBearer,
  mobileController.payAppleReady
);
routerMobile.post(
  "/payments/credit/ready",
  mobileController.verifyBearer,
  mobileController.payCreditReady
);
routerMobile.post(
  "/payments/confirm",
  mobileController.verifyBearer,
  mobileController.confirmPayment
);
routerMobile.post(
  "/payments/refund",
  mobileController.verifyBearer,
  mobileController.refundPayment
);

/** Inquiries **/
routerMobile.post("/inquiries", inquiryLimiter, mobileController.createInquiry);

export default routerMobile;
