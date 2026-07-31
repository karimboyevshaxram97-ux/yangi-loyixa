import mongoose, { Schema } from "mongoose";

// Mobil mijozlarning refresh tokenlari. Tokenning o'zi emas, SHA-256 xeshi
// saqlanadi — DB sizib chiqsa ham tokenlardan foydalanib bo'lmaydi.
const refreshTokenSchema = new Schema(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Member",
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revoked: {
      type: Boolean,
      default: false,
    },
    // Qaysi qurilmadan berilgani — diagnostika va sessiyalarni boshqarish uchun
    userAgent: {
      type: String,
      default: "",
    },
  },
  { timestamps: true, collection: "refreshTokens" }
);

// TTL index: muddati o'tgan tokenlarni MongoDB o'zi tozalaydi
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("RefreshToken", refreshTokenSchema);
