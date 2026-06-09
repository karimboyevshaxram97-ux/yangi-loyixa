import express from "express";
import memberController from "./controllers/member.controller";
import productController from "./controllers/product.controller";
import orderController from "./controllers/order.controller";
import paymentController from "./controllers/payment.controller";
import inquiryController from "./controllers/inquiry.controller";
import makeUploader from "./libs/types/utils/uploader";

const router = express.Router();

/** Client Page **/
router.get("/", (req, res) => {
  res.render("client");
});

/** Member **/
router.get("/member/shop", memberController.getShop);
router.post("/member/login", memberController.login);
router.post(
  "/member/signup",
  makeUploader("members").single("memberImage"),
  memberController.signup
);
router.post("/member/logout", memberController.verifyAuth, memberController.logout);
router.get("/member/detail", memberController.verifyAuth, memberController.getMemberDetail);
router.post(
  "/member/update",
  memberController.verifyAuth,
  makeUploader("members").single("memberImage"),
  memberController.updateMember
);
router.get("/member/top-users", memberController.getTopUsers);

/** Product **/
router.get("/product/all", productController.getProducts);
router.post("/product/like/:id", productController.likeProduct);
router.get("/product/:id", memberController.retrieveAuth, productController.getProduct);

/** Order **/
router.post("/order/create", memberController.verifyAuth, orderController.createOrder);
router.get("/order/all", memberController.verifyAuth, orderController.getMyOrders);
router.post("/order/update", memberController.verifyAuth, orderController.updateOrder);

/** Inquiry **/
router.post("/inquiry/create", inquiryController.createInquiry);

/** Payment **/
router.post("/payment/kakao/ready", memberController.verifyAuth, paymentController.initiateKakaoPay);
router.post("/payment/samsung/ready", memberController.verifyAuth, paymentController.initiateSamsungPay);
router.post("/payment/apple/ready", memberController.verifyAuth, paymentController.initiateApplePay);
router.post("/payment/credit/ready", memberController.verifyAuth, paymentController.initiateCreditCard);
router.post("/payment/confirm", memberController.verifyAuth, paymentController.confirmPayment);
router.post("/payment/refund", memberController.verifyAuth, paymentController.refundPayment);

export default router;