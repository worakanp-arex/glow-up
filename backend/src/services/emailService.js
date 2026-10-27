import nodemailer from "nodemailer";
import { isProductionLike } from "../config/env.js";

const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const smtpPort = Number(process.env.SMTP_PORT) || 587;
const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      // Verification codes and reset links must never travel unencrypted: refuse
      // to send if the server won't upgrade the connection to TLS (STARTTLS).
      // Left optional for local development against a plain-text mail catcher.
      requireTLS: isProductionLike() && smtpPort !== 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

// Hosts that block outbound SMTP (e.g. Railway Free/Trial/Hobby) can send
// through Brevo's HTTPS API instead: set BREVO_API_KEY and EMAIL_FROM (a sender
// address verified in Brevo). When both are set, this takes priority over SMTP.
const brevoConfigured = Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);

const APP_NAME = "Glow Up";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "worakan.p@kkumail.com";
const RESPONSIBLE_ORG = "วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น";
const PARTNER_ORGS = "โรงพยาบาลธัญญารักษ์ขอนแก่น · คณะพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น";

export function isEmailDeliveryConfigured() {
  return brevoConfigured || smtpConfigured;
}

async function sendViaBrevo({ to, subject, html }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: process.env.EMAIL_FROM_NAME || APP_NAME, email: process.env.EMAIL_FROM },
      to: [{ email: to }],
      replyTo: { email: SUPPORT_EMAIL },
      subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo responded ${res.status}: ${detail.slice(0, 200)}`);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

// Every outgoing email shares this layout so recipients can always see where
// the message came from and who to contact.
function renderEmail({ heading, body, reason }) {
  const siteUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return `<!doctype html>
<html lang="th">
<body style="margin:0;padding:24px;background:#f3f6fb;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1f2a44;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;">
    <tr><td style="padding:20px 28px;background:#2563eb;color:#ffffff;font-size:20px;font-weight:700;">${APP_NAME}</td></tr>
    <tr><td style="padding:28px;line-height:1.7;font-size:15px;">
      <h1 style="margin:0 0 16px;font-size:18px;">${heading}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e5e9f2;font-size:12px;line-height:1.7;color:#5b6784;">
      <p style="margin:0 0 8px;"><strong>แหล่งที่มา:</strong> อีเมลนี้ส่งโดยอัตโนมัติจากระบบ ${APP_NAME} (<a href="${escapeHtml(siteUrl)}" style="color:#2563eb;">${escapeHtml(siteUrl)}</a>) ${escapeHtml(reason)}</p>
      <p style="margin:0 0 8px;"><strong>หน่วยงานที่รับผิดชอบ:</strong> ${RESPONSIBLE_ORG}<br>ร่วมกับ ${PARTNER_ORGS}</p>
      <p style="margin:0;"><strong>ติดต่อสอบถาม:</strong> <a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb;">${SUPPORT_EMAIL}</a><br>กรุณาอย่าตอบกลับอีเมลฉบับนี้ หากไม่ได้ทำรายการเอง สามารถเพิกเฉยได้</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendMail({ to, subject, html }) {
  // Unit tests exercise controllers without a mail server.
  if (process.env.NODE_ENV === "test") return;

  if (brevoConfigured) {
    try {
      await sendViaBrevo({ to, subject, html });
      return;
    } catch (cause) {
      const err = new Error(`Failed to send email: ${cause.message}`, { cause });
      err.code = "EMAIL_DELIVERY_FAILED";
      throw err;
    }
  }

  if (!transporter) {
    const err = new Error("Email is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS or BREVO_API_KEY / EMAIL_FROM)");
    err.code = "EMAIL_DELIVERY_FAILED";
    throw err;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      replyTo: SUPPORT_EMAIL,
      to,
      subject,
      html,
    });
  } catch (cause) {
    const err = new Error(`Failed to send email: ${cause.message}`, { cause });
    err.code = "EMAIL_DELIVERY_FAILED";
    throw err;
  }
}

export function sendOtpEmail(to, otp) {
  return sendMail({
    to,
    subject: `รหัสยืนยันการสมัครสมาชิก ${APP_NAME}`,
    html: renderEmail({
      heading: "รหัสยืนยันอีเมลของคุณ",
      body: `<p>ใช้รหัสด้านล่างเพื่อยืนยันการสมัครสมาชิก</p><p style="font-size:30px;font-weight:700;letter-spacing:6px;margin:12px 0;">${escapeHtml(otp)}</p><p>รหัสนี้จะหมดอายุใน 10 นาที</p>`,
      reason: "เนื่องจากมีการใช้อีเมลนี้สมัครสมาชิก",
    }),
  });
}

// Sent instead of a verification code when someone starts a sign-up with an
// address that already has an account. The sign-up page answers exactly as it
// does for a new address, so it can't be used to find out who has registered;
// the real owner learns about it here.
export function sendAccountExistsEmail(to) {
  const siteUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const login = escapeHtml(`${siteUrl}/login`);
  const forgot = escapeHtml(`${siteUrl}/forgot-password`);
  return sendMail({
    to,
    subject: `อีเมลนี้มีบัญชี ${APP_NAME} อยู่แล้ว`,
    html: renderEmail({
      heading: "อีเมลนี้มีบัญชีอยู่แล้ว",
      body: `<p>มีการใช้อีเมลนี้เพื่อสมัครสมาชิกใหม่ แต่อีเมลนี้มีบัญชีอยู่แล้ว จึงไม่มีการสร้างบัญชีใหม่</p><p>หากเป็นคุณ <a href="${login}" style="color:#2563eb;">เข้าสู่ระบบ</a> ได้เลย หรือ <a href="${forgot}" style="color:#2563eb;">ตั้งรหัสผ่านใหม่</a> หากลืมรหัสผ่าน</p><p>หากไม่ใช่คุณ ไม่ต้องทำอะไร บัญชีของคุณยังปลอดภัยอยู่</p>`,
      reason: "เนื่องจากมีการใช้อีเมลนี้เริ่มสมัครสมาชิก",
    }),
  });
}

export function sendPasswordResetEmail(to, resetUrl) {
  const url = escapeHtml(resetUrl);
  return sendMail({
    to,
    subject: `รีเซ็ตรหัสผ่าน ${APP_NAME}`,
    html: renderEmail({
      heading: "ตั้งรหัสผ่านใหม่",
      body: `<p>คลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ลิงก์หมดอายุใน 30 นาที)</p><p><a href="${url}" style="display:inline-block;padding:12px 22px;background:#2563eb;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:600;">ตั้งรหัสผ่านใหม่</a></p><p style="font-size:12px;color:#5b6784;word-break:break-all;">หากกดปุ่มไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์: ${url}</p>`,
      reason: "เนื่องจากมีการร้องขอรีเซ็ตรหัสผ่านของบัญชีนี้",
    }),
  });
}

export function sendFamilyInviteEmail(to, inviterName, acceptUrl) {
  const url = escapeHtml(acceptUrl);
  // The inviter's name is free text typed by a member, so it stays in the escaped
  // body only: a subject line is where a spoofed message would be read first.
  const inviter = escapeHtml(String(inviterName).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 100));
  return sendMail({
    to,
    subject: `คำเชิญติดตามความคืบหน้าบน ${APP_NAME}`,
    html: renderEmail({
      heading: "คำเชิญติดตามความคืบหน้า",
      body: `<p>${inviter} เชิญคุณเข้าร่วมติดตามความคืบหน้าการฟื้นฟูแบบจำกัดสิทธิ์ (เห็นเฉพาะระดับความสำเร็จ ไม่เห็นข้อมูลสุขภาพโดยละเอียด)</p><p><a href="${url}" style="display:inline-block;padding:12px 22px;background:#2563eb;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:600;">ตอบรับคำเชิญ</a></p><p style="font-size:12px;color:#5b6784;word-break:break-all;">ลิงก์นี้จะหมดอายุใน 7 วัน: ${url}</p>`,
      reason: `เนื่องจาก ${inviter} ระบุอีเมลนี้ในการเชิญสมาชิกครอบครัว หากไม่รู้จักผู้เชิญ กรุณาเพิกเฉย`,
    }),
  });
}
