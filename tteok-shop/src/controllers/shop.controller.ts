import { Request, Response } from "express";
import { T } from "../libs/types/common";
import Errors, { HttpCode, Message } from "../libs/types/errors";
import MemberService from "../models/Member.service";
import OrderService from "../models/Order.service";
import { LoginInput, MemberInput, MemberUpdateInput } from "../libs/types/member";
import { AdminRequest } from "../libs/types/member";
import makeUploader from "../libs/types/utils/uploader";

const memberService = new MemberService();
const orderService = new OrderService();
const shopController: T = {};

shopController.goHome = async (req: Request, res: Response) => {
  try {
    console.log("goHome");
    let shop = null, stats = null;
    try { shop = await memberService.getShop(); } catch (_) {}
    try { stats = await memberService.getDashboardStats(); } catch (_) {}
    res.render("home", { shop, stats });
  } catch (err) {
    console.log("Error, goHome:", err);
    res.redirect("/admin/login");
  }
};

shopController.getAdminOrders = async (req: Request, res: Response) => {
  try {
    console.log("getAdminOrders");
    const orders = await orderService.getAllOrdersForAdmin();
    res.render("orders", { orders });
  } catch (err) {
    console.log("Error, getAdminOrders:", err);
    res.render("orders", { orders: [] });
  }
};

shopController.updateAdminOrder = async (req: Request, res: Response) => {
  try {
    console.log("updateAdminOrder");
    const id = req.params.id as string;
    const { orderStatus } = req.body;
    const result = await orderService.updateAdminOrderStatus(id, orderStatus);
    res.status(HttpCode.OK).json({ data: result });
  } catch (err) {
    console.log("Error, updateAdminOrder:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

shopController.getLogin = async (req: Request, res: Response) => {
  try {
    console.log("getLogin");
    const session = req.session as any;
    if (session.member) {
      res.redirect("/admin/product/all");
      return;
    }

    try {
      await memberService.getShop();
      res.render("login");
    } catch (err) {
      if (err instanceof Errors && err.code === HttpCode.NOT_FOUND) {
        res.redirect("/admin/signup");
        return;
      }
      console.log("Error, getLogin:", err);
      res.redirect("/admin/signup");
    }
  } catch (err) {
    console.log("Error, getLogin outer:", err);
    res.redirect("/admin/signup");
  }
};

shopController.processLogin = async (req: Request, res: Response) => {
  try {
    console.log("processLogin");
    const input: LoginInput = req.body;
    const result = await memberService.processLogin(input);
    const session = req.session as any;
    const safeMember = JSON.parse(JSON.stringify(result));
    safeMember._id = String(result._id);
    session.member = safeMember;

    session.save((err: any) => {
      if (err) {
        console.log("Error saving session:", err);
        res.send(
          `<script>alert("Session error"); window.location.replace("/admin/login")</script>`
        );
      } else {
        res.redirect("/admin/");
      }
    });
  } catch (err) {
    console.log("Error, processLogin:", err);
    const message =
      err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
    res.send(
      `<script>alert("${message}"); window.location.replace("/admin/login")</script>`
    );
  }
};

shopController.getSignup = async (req: Request, res: Response) => {
  try {
    console.log("getSignup");
    const session = req.session as any;
    if (session.member) {
      res.redirect("/admin/product/all");
      return;
    }

    try {
      await memberService.getShop();
      res.redirect("/admin/login");
    } catch (err) {
      if (err instanceof Errors && err.code === HttpCode.NOT_FOUND) {
        res.render("signup");
        return;
      }
      console.log("Error, getSignup:", err);
      res.redirect("/admin/login");
    }
  } catch (err) {
    console.log("Error, getSignup outer:", err);
    res.redirect("/admin/login");
  }
};

shopController.processSignup = async (req: AdminRequest, res: Response) => {
  try {
    console.log("processSignup");
    const file = req.file;
    if (!file) throw new Errors(HttpCode.BAD_REQUEST, Message.IMAGE_REQUIRED);

    const input: MemberInput = req.body;
    input.memberImage = file.path.replace(/\\/g, "/");

    await memberService.processSignup(input);
    res.send(
      `<script>alert("Signup successful! Please login."); window.location.replace("/admin/login");</script>`
    );
  } catch (err) {
    console.log("Error, processSignup:", err);
    const message =
      err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
    res.send(
      `<script>alert("${message}"); window.location.replace("/admin/signup")</script>`
    );
  }
};

shopController.updateShopImage = async (req: AdminRequest, res: Response) => {
  try {
    console.log("updateShopImage");
    if (!req.file) {
      res.redirect("/admin/");
      return;
    }
    const imagePath = req.file.path.replace(/\\/g, "/");
    await memberService.updateShopImagePath(imagePath);
    res.redirect("/admin/");
  } catch (err) {
    console.log("Error, updateShopImage:", err);
    res.redirect("/admin/");
  }
};

shopController.logout = async (req: Request, res: Response) => {
  try {
    console.log("logout");
    await memberService.clearShopImage();
    req.session.destroy((err: any) => {
      if (err) console.log("Error destroying session:", err);
      res.redirect("/admin/login");
    });
  } catch (err) {
    console.log("Error, logout:", err);
    res.redirect("/admin/login");
  }
};

shopController.checkAuthSession = async (req: Request, res: Response) => {
  try {
    console.log("checkAuthSession");
    const session = req.session as any;
    if (session.member) {
      res.status(HttpCode.OK).json({ member: session.member });
    } else {
      res.status(HttpCode.UNAUTHORIZED).json({ message: "Not authenticated" });
    }
  } catch (err) {
    console.log("Error, checkAuthSession:", err);
  }
};

shopController.verifyShop = async (
  req: Request,
  res: Response,
  next: any
) => {
  try {
    const session = req.session as any;
    if (!session.member)
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_AUTHENTICATED);
    if (session.member.memberType !== "TTEOK_SHOP")
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_AUTHENTICATED);
    next();
  } catch (err) {
    console.log("Error, verifyShop:", err);
    res.redirect("/admin/login");
  }
};

shopController.getUsers = async (req: Request, res: Response) => {
  try {
    console.log("getUsers");
    const result = await memberService.getUsers();
    res.render("users", { users: result });
  } catch (err) {
    console.log("Error, getUsers:", err);
  }
};

shopController.updateChosenUser = async (req: Request, res: Response) => {
  try {
    console.log("updateChosenUser");
    const input: MemberUpdateInput = req.body;
    const result = await memberService.updateChosenUser(input);
    res.status(HttpCode.OK).json({ data: result });
  } catch (err) {
    console.log("Error, updateChosenUser:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default shopController;