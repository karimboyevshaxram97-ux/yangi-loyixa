import Errors, { HttpCode, Message } from "../libs/types/errors";
import {
  AUTH_TIMER,
  MOBILE_ACCESS_TOKEN_TTL,
  MOBILE_REFRESH_TOKEN_DAYS,
} from "../libs/types/common";
import { Member } from "../libs/types/member";
import RefreshTokenModel from "../schema/RefreshToken.model";
import jwt from "jsonwebtoken";
import * as crypto from "crypto";

class AuthService {
  private readonly secretToken;
  private readonly refreshTokenModel;

  constructor() {
    this.secretToken = process.env.SECRET_TOKEN as string;
    this.refreshTokenModel = RefreshTokenModel;
  }

  public async createToken(payload: Member): Promise<string> {
    return new Promise((resolve, reject) => {
      const duration = `${AUTH_TIMER}h`;
      jwt.sign(
        payload,
        process.env.SECRET_TOKEN as string,
        { expiresIn: duration },
        (err, token) => {
          if (err) {
            reject(
              new Errors(HttpCode.UNAUTHORIZED, Message.TOKEN_CREATION_FAILED)
            );
          } else resolve(token as string);
        }
      );
    });
  }

  public async checkAuth(token: string): Promise<Member> {
    const result: Member = (await jwt.verify(
      token,
      this.secretToken
    )) as Member;
    console.log(`--- [AUTH] memberNick: ${result.memberNick} ---`);
    return result;
  }

  /** ================= Mobil (Bearer) autentifikatsiya ================= **/

  /**
   * Mobil access token — payload minimal (butun member emas):
   * token hajmi kichik bo'ladi va eskirgan profil ma'lumotlari tokenda qolmaydi.
   */
  public async createAccessToken(member: Member): Promise<string> {
    const payload = {
      _id: String(member._id),
      memberNick: member.memberNick,
      memberType: member.memberType,
    };
    return new Promise((resolve, reject) => {
      jwt.sign(
        payload,
        this.secretToken,
        { expiresIn: MOBILE_ACCESS_TOKEN_TTL as any },
        (err, token) => {
          if (err) {
            reject(
              new Errors(HttpCode.UNAUTHORIZED, Message.TOKEN_CREATION_FAILED)
            );
          } else resolve(token as string);
        }
      );
    });
  }

  private hashRefreshToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  /** Yangi refresh token beradi; DB da faqat xeshi saqlanadi */
  public async issueRefreshToken(
    memberId: any,
    userAgent = ""
  ): Promise<string> {
    const rawToken = crypto.randomBytes(48).toString("base64url");
    const expiresAt = new Date(
      Date.now() + MOBILE_REFRESH_TOKEN_DAYS * 24 * 3600 * 1000
    );
    await this.refreshTokenModel.create({
      memberId,
      tokenHash: this.hashRefreshToken(rawToken),
      expiresAt,
      userAgent: String(userAgent).slice(0, 300),
    });
    return rawToken;
  }

  /**
   * Refresh token rotation: eski token bekor qilinib, yangisi beriladi.
   * Bekor qilingan token qayta ishlatilsa (o'g'irlangan bo'lishi mumkin) —
   * shu a'zoning BARCHA refresh tokenlari bekor qilinadi (reuse detection).
   */
  public async rotateRefreshToken(
    rawToken: string,
    userAgent = ""
  ): Promise<{ memberId: string; refreshToken: string }> {
    if (!rawToken)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.INVALID_REFRESH_TOKEN);

    const tokenHash = this.hashRefreshToken(rawToken);
    const stored = await this.refreshTokenModel.findOne({ tokenHash }).exec();

    if (!stored)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.INVALID_REFRESH_TOKEN);

    if (stored.revoked) {
      console.log(
        `--- [AUTH] Refresh token reuse detected, revoking all sessions for member: ${stored.memberId} ---`
      );
      await this.refreshTokenModel
        .updateMany({ memberId: stored.memberId }, { revoked: true })
        .exec();
      throw new Errors(HttpCode.UNAUTHORIZED, Message.INVALID_REFRESH_TOKEN);
    }

    if (stored.expiresAt < new Date())
      throw new Errors(HttpCode.UNAUTHORIZED, Message.INVALID_REFRESH_TOKEN);

    stored.revoked = true;
    await stored.save();

    const refreshToken = await this.issueRefreshToken(
      stored.memberId,
      userAgent
    );
    return { memberId: String(stored.memberId), refreshToken };
  }

  /** Logout: berilgan refresh tokenni bekor qiladi (idempotent) */
  public async revokeRefreshToken(rawToken: string): Promise<void> {
    if (!rawToken) return;
    await this.refreshTokenModel
      .updateOne(
        { tokenHash: this.hashRefreshToken(rawToken) },
        { revoked: true }
      )
      .exec();
  }
}

export default AuthService;
