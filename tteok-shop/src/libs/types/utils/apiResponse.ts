import { Request, Response, NextFunction } from "express";
import Errors, { HttpCode, Message } from "../errors";

/**
 * Mobil API uchun yagona javob konverti (envelope).
 * Muvaffaqiyat:  { success: true,  data: ... }
 * Xatolik:       { success: false, error: { status, message } }
 * Mijoz (mobil ilova) doim bitta formatni parse qiladi.
 */

export const apiOk = (
  res: Response,
  data: any,
  status: HttpCode = HttpCode.OK
): void => {
  res.status(status).json({ success: true, data });
};

export const apiFail = (res: Response, err: unknown): void => {
  if (err instanceof Errors) {
    res.status(err.code).json({
      success: false,
      error: { status: err.code, message: err.message },
    });
  } else {
    res.status(Errors.standard.code).json({
      success: false,
      error: {
        status: Errors.standard.code,
        message: Errors.standard.message,
      },
    });
  }
};

/** Pagination metadata — ro'yxat endpointlari uchun standart shakl */
export const buildPagination = (
  page: number,
  limit: number,
  total: number
) => ({
  page,
  limit,
  total,
  totalPages: Math.max(Math.ceil(total / limit), 1),
  hasNext: page * limit < total,
});

/**
 * try/catch shablonini markazlashtiradi: handler ichida xato tashlansa,
 * log qilinadi va konvert formatida javob qaytadi.
 */
export const asyncHandler =
  (name: string, fn: (req: any, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log(name);
      await fn(req, res, next);
    } catch (err) {
      console.log(`Error, ${name}:`, err);
      apiFail(res, err);
    }
  };

/** Majburiy maydonlar tekshiruvi — bo'sh bo'lsa 400 VALIDATION_FAILED */
export const requireFields = (body: any, fields: string[]): void => {
  const missing = fields.filter(
    (field) =>
      body?.[field] === undefined ||
      body?.[field] === null ||
      String(body[field]).trim() === ""
  );
  if (missing.length > 0) {
    throw new Errors(HttpCode.BAD_REQUEST, Message.VALIDATION_FAILED);
  }
};
