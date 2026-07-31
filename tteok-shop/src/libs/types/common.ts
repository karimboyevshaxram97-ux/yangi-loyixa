export interface T {
  [key: string]: any;
}

export const AUTH_TIMER = 24;
export const MORGAN_FORMAT = ":method :url :response-time [:status] \n";

/** Mobil API (Bearer) autentifikatsiya sozlamalari **/
// Access token qisqa muddatli — o'g'irlansa ham zarar cheklangan bo'ladi;
// mijoz muddat tugaganda refresh token bilan yangisini oladi
export const MOBILE_ACCESS_TOKEN_TTL = process.env.MOBILE_ACCESS_TTL ?? "1h";
export const MOBILE_REFRESH_TOKEN_DAYS =
  Number(process.env.MOBILE_REFRESH_DAYS) > 0
    ? Number(process.env.MOBILE_REFRESH_DAYS)
    : 30;