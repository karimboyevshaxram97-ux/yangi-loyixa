import mongoose from "mongoose";
import Errors, { HttpCode, Message } from "./errors";

export const shapeIntoMongooseObjectId = (target: any) => {
  if (typeof target !== "string") return target;
  if (!mongoose.Types.ObjectId.isValid(target)) {
    throw new Errors(HttpCode.BAD_REQUEST, Message.NO_DATA_FOUND);
  }
  return new mongoose.Types.ObjectId(target);
};
