import { Request, Response, NextFunction } from "express";
import { HttpCode, Message } from "../errors";

/**
 * Oddiy in-memory rate limiter (sliding window emas, fixed window).
 * Brute-force (login/signup) va spam (inquiry) dan himoya qiladi.
 * Eslatma: bir nechta server instansi bo'lsa Redis kabi umumiy store kerak
 * bo'ladi — hozirgi bitta-instansli deploy uchun bu yetarli.
 */

interface HitRecord {
  count: number;
  resetAt: number;
}

export const rateLimiter = (windowMs: number, maxRequests: number) => {
  const hits = new Map<string, HitRecord>();

  const cleanup = (now: number) => {
    // Map cheksiz o'smasligi uchun eskirgan yozuvlarni tozalaymiz
    if (hits.size < 1000) return;
    for (const [key, record] of hits) {
      if (record.resetAt <= now) hits.delete(key);
    }
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    cleanup(now);

    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const record = hits.get(key);

    if (!record || record.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    record.count += 1;
    if (record.count > maxRequests) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res
        .status(HttpCode.TOO_MANY_REQUESTS)
        .set("Retry-After", String(retryAfterSec))
        .json({
          success: false,
          error: {
            status: HttpCode.TOO_MANY_REQUESTS,
            message: Message.TOO_MANY_REQUESTS,
          },
        });
      return;
    }

    next();
  };
};
