import { Request, Response } from "express";
import { T } from "../libs/types/common";
import Errors, { HttpCode, Message } from "../libs/types/errors";
import MemberService from "../models/Member.service";
import AuthService from "../models/Auth.service";
import {
  LoginInput,
  MemberInput,
  MemberUpdateInput,
} from "../libs/types/member";
import { removeUploadedFiles } from "../libs/types/utils/uploader";

const memberService = new MemberService();
const authService = new AuthService();
const memberController: T = {};

// Cross-origin deploys (frontend and backend on different domains) require
// SameSite=None + Secure for the browser to send the cookie back at all;
// on localhost (http, same-site) that combination would silently break login,
// so it's only applied when NODE_ENV=production.
const isProd = process.env.NODE_ENV === "production";
const authCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax",
};

memberController.getShop = async (req: any, res: Response) => {
  try {
    console.log("getShop");
    const result = await memberService.getShop();
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, getShop:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.signup = async (req: any, res: Response) => {
  try {
    console.log("signup");
    const input: MemberInput = req.body;
    if (req.file) {
      input.memberImage = req.file.path.replace(/\\/g, "/");
    }
    const result = await memberService.Signup(input);
    const token = await authService.createToken(result);
    res.cookie("accessToken", token, authCookieOptions);
    res.status(HttpCode.CREATED).json(result);
  } catch (err) {
    console.log("Error, signup:", err);
    removeUploadedFiles(req.file);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.login = async (req: any, res: Response) => {
  try {
    console.log("login");
    const input: LoginInput = req.body;
    const result = await memberService.login(input);
    const token = await authService.createToken(result);
    res.cookie("accessToken", token, authCookieOptions);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, login:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.logout = async (req: any, res: Response) => {
  try {
    console.log("logout");
    res.clearCookie("accessToken", authCookieOptions);
    res.status(HttpCode.OK).json({ message: "Logged out!" });
  } catch (err) {
    console.log("Error, logout:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.getMemberDetail = async (req: any, res: Response) => {
  try {
    console.log("getMemberDetail");
    const result = await memberService.getMemberDetail(req.member);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, getMemberDetail:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.updateMember = async (req: any, res: Response) => {
  try {
    console.log("updateMember");
    const input: MemberUpdateInput = req.body;
    if (req.file) {
      input.memberImage = req.file.path.replace(/\\/g, "/");
    }
    const result = await memberService.updateMember(req.member, input);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, updateMember:", err);
    removeUploadedFiles(req.file);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.getTopUsers = async (req: any, res: Response) => {
  try {
    console.log("getTopUsers");
    const result = await memberService.getTopUsers();
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, getTopUsers:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.verifyAuth = async (req: any, res: Response, next: any) => {
  try {
    const token = req.cookies["accessToken"];
    if (!token) throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);

    let payload;
    try {
      payload = await authService.checkAuth(token);
    } catch (jwtErr) {
      // jwt.verify throws a raw jsonwebtoken error (expired/invalid signature/malformed),
      // not an Errors instance — without this translation it falls through to the
      // generic 500 below, which never matches the frontend's 401-on-logout interceptor
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    }

    // Token amal qilsa ham, a'zo bloklangan/o'chirilgan bo'lishi mumkin — DB dan tekshiramiz
    req.member = await memberService.ensureActiveMember(payload._id);
    next();
  } catch (err) {
    console.log("Error, verifyAuth:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.retrieveAuth = async (req: any, res: Response, next: any) => {
  try {
    const token = req.cookies["accessToken"];
    if (token) req.member = await authService.checkAuth(token);
    next();
  } catch (err) {
    next();
  }
};

export default memberController;