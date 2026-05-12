import express from "express";
import shopController from "./controllers/shop.controller";
import productController from "./controllers/product.controller";
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

export default routerAdmin;