import path from "path";
import fs from "fs";
import multer from "multer";
import { v4 } from "uuid";

/** Xatolik yuz berganda yuklangan fayllar "yetim" bo'lib qolmasligi uchun o'chiradi */
export const removeUploadedFiles = (
  ...files: Array<Express.Multer.File | undefined>
): void => {
  files.forEach((file) => {
    if (!file?.path) return;
    fs.unlink(file.path, (err) => {
      if (err) console.log("Warning: could not remove uploaded file:", err.message);
    });
  });
};

function getTargetImageStorage(address: string) {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, `./uploads/${address}`);
    },
    filename: function (req, file, cb) {
      const extension = path.parse(file.originalname).ext;
      const random_name = v4() + extension;
      cb(null, random_name);
    },
  });
}

const makeUploader = (address: string) => {
  const storage = getTargetImageStorage(address);
  return multer({ storage: storage });
};

export default makeUploader;