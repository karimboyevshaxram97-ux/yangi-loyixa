import express from "express";
import shopController from "./controllers/shop.controller";
import productController from "./controllers/product.controller";
import inquiryController from "./controllers/inquiry.controller";
import makeUploader from "./libs/types/utils/uploader";

const routerAdmin = express.Router();

/** SHOP **/
routerAdmin.get("/", shopController.goHome);
routerAdmin.get("/login", shopController.getLogin);
routerAdmin.post("/login", shopController.processLogin);
routerAdmin.get("/signup", shopController.getSignup);
routerAdmin.post(
  "/signup",
  makeUploader("members").single("memberImage"),
  shopController.processSignup
);
routerAdmin.get("/logout", shopController.logout);
routerAdmin.post(
  "/update-image",
  shopController.verifyShop,
  makeUploader("members").single("memberImage"),
  shopController.updateShopImage
);
routerAdmin.get("/check-me", shopController.checkAuthSession);

/** PRODUCT **/
routerAdmin.get(
  "/product/all",
  shopController.verifyShop,
  productController.getAllProducts
);
routerAdmin.post(
  "/product/create",
  shopController.verifyShop,
  makeUploader("products").array("productImages", 5),
  productController.createNewProduct
);
routerAdmin.post(
  "/product/:id",
  shopController.verifyShop,
  productController.updateChosenProduct
);

/** ORDER **/
routerAdmin.get(
  "/order/all",
  shopController.verifyShop,
  shopController.getAdminOrders
);
routerAdmin.post(
  "/order/:id",
  shopController.verifyShop,
  shopController.updateAdminOrder
);

/** USER **/
routerAdmin.get(
  "/user/all",
  shopController.verifyShop,
  shopController.getUsers
);
routerAdmin.post(
  "/user/edit",
  shopController.verifyShop,
  shopController.updateChosenUser
);

/** INQUIRY **/
routerAdmin.get("/inquiry/pending-count", shopController.verifyShop, inquiryController.getPendingCount);
routerAdmin.get("/inquiry/all", shopController.verifyShop, inquiryController.getInquiries);
routerAdmin.post("/inquiry/reply", shopController.verifyShop, inquiryController.replyToInquiry);

export default routerAdmin;