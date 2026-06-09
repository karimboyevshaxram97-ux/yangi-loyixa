import { Request, Response } from "express";
import { T } from "../libs/types/common";
import Errors, { HttpCode } from "../libs/types/errors";
import InquiryService from "../models/Inquiry.service";
import { InquiryInput, InquiryReplyInput } from "../libs/types/inquiry";

const inquiryService = new InquiryService();
const inquiryController: T = {};

/** POST /inquiry/create  — public **/
inquiryController.createInquiry = async (req: Request, res: Response) => {
  try {
    console.log("createInquiry");
    const input: InquiryInput = req.body;
    const result = await inquiryService.createInquiry(input);
    res.status(HttpCode.CREATED).json(result);
  } catch (err) {
    console.log("Error, createInquiry:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** GET /admin/inquiry/pending-count  — admin **/
inquiryController.getPendingCount = async (req: Request, res: Response) => {
  try {
    const count = await inquiryService.getPendingCount();
    res.status(HttpCode.OK).json({ count });
  } catch (err) {
    res.status(HttpCode.OK).json({ count: 0 });
  }
};

/** GET /admin/inquiry/all  — admin **/
inquiryController.getInquiries = async (req: Request, res: Response) => {
  try {
    console.log("getInquiries");
    const result = await inquiryService.getInquiries();
    res.render("inquiries", { inquiries: result });
  } catch (err) {
    console.log("Error, getInquiries:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** POST /admin/inquiry/reply  — admin **/
inquiryController.replyToInquiry = async (req: Request, res: Response) => {
  try {
    console.log("replyToInquiry");
    const input: InquiryReplyInput = req.body;
    const result = await inquiryService.replyToInquiry(input);
    res.status(HttpCode.OK).json({ data: result });
  } catch (err) {
    console.log("Error, replyToInquiry:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default inquiryController;
