import nodemailer, { Transporter } from "nodemailer";
import InquiryModel from "../schema/Inquiry.model";
import { Inquiry, InquiryInput, InquiryReplyInput } from "../libs/types/inquiry";
import { InquiryStatus } from "../libs/types/enums/inquiry.enum";
import { shapeIntoMongooseObjectId } from "../libs/types/config";
import Errors, { HttpCode, Message } from "../libs/types/errors";
import { escapeHtml } from "../libs/types/utils/escape";

class InquiryService {
  private readonly inquiryModel;
  private transporter: Transporter | null = null;

  constructor() {
    this.inquiryModel = InquiryModel;
  }

  // Real SMTP bo'lsa ishlatadi, bo'lmasa Ethereal test akkaunt yaratadi
  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) return this.transporter;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log("✅ Email: real SMTP (Gmail) ishlatilmoqda");
    } else {
      // Avtomatik test akkaunt — hech narsa sozlamasdan ishlaydi
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log("🧪 Email: Ethereal test rejimi");
      console.log("   Yuborilgan emaillarni ko'rish uchun: https://ethereal.email");
      console.log(`   Login: ${testAccount.user} | Parol: ${testAccount.pass}`);
    }

    return this.transporter;
  }

  public async getPendingCount(): Promise<number> {
    return await this.inquiryModel.countDocuments({ status: InquiryStatus.PENDING }).exec();
  }

  public async createInquiry(input: InquiryInput): Promise<Inquiry> {
    try {
      const result = await this.inquiryModel.create(input);
      return result as unknown as Inquiry;
    } catch (err) {
      console.log("Error, Inquiry.service:createInquiry:", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async getInquiries(): Promise<Inquiry[]> {
    const result = await this.inquiryModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
    return result as unknown as Inquiry[];
  }

  public async replyToInquiry(input: InquiryReplyInput): Promise<Inquiry> {
    const inquiryId = shapeIntoMongooseObjectId(input.inquiryId);

    const inquiry = await this.inquiryModel.findById(inquiryId).exec();
    if (!inquiry) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    const updated = await this.inquiryModel
      .findByIdAndUpdate(
        inquiryId,
        {
          reply: input.reply,
          status: InquiryStatus.REPLIED,
          repliedAt: new Date(),
        },
        { new: true }
      )
      .exec();

    if (!updated) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);

    await this.sendReplyEmail(
      inquiry.email,
      inquiry.name,
      inquiry.message,
      input.reply
    );

    return updated as unknown as Inquiry;
  }

  private async sendReplyEmail(
    toEmail: string,
    toName: string,
    originalMessage: string,
    replyText: string
  ): Promise<void> {
    const transport = await this.getTransporter();

    // Foydalanuvchi kiritgan matnlar email HTML iga qo'yilishidan oldin escape qilinadi
    const safeName = escapeHtml(toName);
    const safeMessage = escapeHtml(originalMessage);
    const safeReply = escapeHtml(replyText);

    const fromAddress = process.env.SMTP_USER
      ? `"떡방 고객센터" <${process.env.SMTP_USER}>`
      : '"떡방 고객센터" <noreply@tteok-shop.com>';

    const mailOptions = {
      from: fromAddress,
      to: toEmail,
      subject: "[떡방] 문의 답변이 도착했습니다",
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#f9fbff;border-radius:16px;overflow:hidden;border:1px solid #e0ecff;">
          <div style="background:linear-gradient(135deg,#4f96de,#8bcfff);padding:32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:2rem;">🍡 떡방</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:1rem;">문의 답변 안내</p>
          </div>
          <div style="padding:32px;">
            <p style="font-size:1rem;color:#2d3e57;">안녕하세요, <strong>${safeName}</strong>님!</p>
            <p style="color:#4a6fa2;">고객님의 문의에 답변을 드립니다.</p>
            <div style="background:#f0f7ff;border-left:4px solid #8bcfff;border-radius:8px;padding:16px;margin:20px 0;">
              <p style="margin:0 0 6px;font-size:0.85rem;color:#7a9abf;font-weight:600;">📩 원래 문의 내용</p>
              <p style="margin:0;color:#2d3e57;font-size:0.95rem;">${safeMessage}</p>
            </div>
            <div style="background:#fff;border:1px solid #d0e8ff;border-radius:12px;padding:20px;margin:20px 0;">
              <p style="margin:0 0 8px;font-size:0.85rem;color:#4f96de;font-weight:700;">✅ 답변</p>
              <p style="margin:0;color:#1f3250;font-size:1rem;line-height:1.7;">${safeReply}</p>
            </div>
            <p style="color:#7a9abf;font-size:0.9rem;margin-top:24px;">
              추가 문의 사항이 있으시면 언제든지 연락해 주세요.<br/>감사합니다. 🍡
            </p>
          </div>
          <div style="background:#e8f3ff;padding:16px;text-align:center;font-size:0.8rem;color:#7a9abf;">
            © 떡방 고객센터 | 이 이메일은 자동 발송된 메일입니다.
          </div>
        </div>
      `,
    };

    try {
      const info = await transport.sendMail(mailOptions);
      console.log(`📧 Email yuborildi: ${toEmail}`);

      // Ethereal rejimida — brauzerda ko'rish uchun URL
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`🔗 Emailni brauzerda ko'ring: ${previewUrl}`);
      }
    } catch (err) {
      console.log("Error sending reply email:", err);
    }
  }
}

export default InquiryService;
