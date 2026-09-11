import nodemailer from "nodemailer";

const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export function isEmailDeliveryConfigured() {
  return smtpConfigured;
}

export async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.log(`[DEV EMAIL] อีเมลยังไม่ได้ตั้งค่า SMTP — จำลองการส่งถึง ${to}`);
    console.log(`[DEV EMAIL] หัวข้อ: ${subject}`);
    console.log(`[DEV EMAIL] เนื้อหา: ${html.replace(/<[^>]+>/g, " ").trim()}`);
    return { devMode: true };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
  return { devMode: false };
}

export function sendOtpEmail(to, otp) {
  return sendMail({
    to,
    subject: "รหัสยืนยันการสมัครสมาชิก Glow Up",
    html: `<p>รหัสยืนยันของคุณคือ</p><h2 style="letter-spacing:4px">${otp}</h2><p>รหัสนี้จะหมดอายุใน 10 นาที หากคุณไม่ได้ทำรายการนี้ กรุณาเพิกเฉยต่ออีเมลนี้</p>`,
  });
}

export function sendPasswordResetEmail(to, resetUrl) {
  return sendMail({
    to,
    subject: "รีเซ็ตรหัสผ่าน Glow Up",
    html: `<p>คลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ลิงก์หมดอายุใน 30 นาที)</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยต่ออีเมลนี้</p>`,
  });
}

export function sendFamilyInviteEmail(to, inviterName, acceptUrl) {
  return sendMail({
    to,
    subject: `${inviterName} เชิญคุณติดตามความคืบหน้าบน Glow Up`,
    html: `<p>${inviterName} เชิญคุณเข้าร่วมติดตามความคืบหน้าการฟื้นฟูแบบจำกัดสิทธิ์ (เห็นเฉพาะระดับความสำเร็จ ไม่เห็นข้อมูลสุขภาพโดยละเอียด)</p><p><a href="${acceptUrl}">${acceptUrl}</a></p><p>ลิงก์นี้จะหมดอายุใน 7 วัน หากคุณไม่รู้จักผู้เชิญ กรุณาเพิกเฉยต่ออีเมลนี้</p>`,
  });
}
