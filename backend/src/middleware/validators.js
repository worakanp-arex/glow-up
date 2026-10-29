import { body, param, query } from "express-validator";
import { passwordProblem, PASSWORD_MAX_LENGTH } from "../utils/passwordPolicy.js";

export function objectIdParam(name) {
  return param(name).isMongoId().withMessage(`${name} must be a valid id`);
}

export function paginationQuery() {
  return [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("limit must be between 1 and 50"),
  ];
}

// JSON ให้ไคลเอนต์ส่งตัวเลข อาร์เรย์ หรืออ็อบเจ็กต์ในที่ที่คาดหวังข้อความได้ และ
// ตัวตรวจสอบสตริงด้านล่างจะแปลงเป็นสตริงโดยเงียบๆ (อาร์เรย์ของอีเมล
// ยังผ่าน isEmail) ทุกฟิลด์ auth จึงถูกตรวจว่าเป็นข้อความจริงก่อน
export function emailBody(field = "email") {
  return body(field)
    .isString().withMessage("valid email is required").bail()
    .isLength({ max: 254 }).withMessage("valid email is required").bail()
    .isEmail().withMessage("valid email is required")
    .normalizeEmail();
}

// รหัสผ่านที่ถูก *กรอก* (ล็อกอิน รหัสผ่านปัจจุบัน): ข้อความอะไรก็ได้ แต่มีขอบเขต
// เพื่อไม่ให้ค่าขนาดใหญ่ถูกใช้เผา CPU ใน bcrypt
export function passwordEntryBody(field) {
  return body(field)
    .isString().withMessage(`${field} is required`).bail()
    .isLength({ min: 1, max: PASSWORD_MAX_LENGTH }).withMessage(`${field} is required`);
}

// รหัสผ่านที่ถูก *ตั้ง*: ต้องผ่านนโยบายรหัสผ่าน
export function newPasswordBody(field) {
  return body(field).custom((value) => {
    const problem = passwordProblem(value);
    if (problem) throw new Error(problem);
    return true;
  });
}

// ลิงก์ที่จะส่งหรือแสดงให้คน: http(s) เท่านั้น และต้องระบุสกีมให้ชัด ไม่เช่นนั้น
// "javascript:", "data:", "file:" หรือสกีมเฉพาะแอปอาจถูกเก็บไว้
// แล้วเสนอให้ใครสักคนเป็นลิงก์ที่ดูไม่เป็นอันตราย
export function urlBody(field, { max = 500, required = false } = {}) {
  const chain = body(field);
  if (!required) chain.optional({ values: "falsy" });
  return chain
    .isString().withMessage(`${field} must be a link`).bail()
    .trim()
    .isLength({ max }).withMessage(`${field} must be at most ${max} characters`).bail()
    .isURL({ protocols: ["http", "https"], require_protocol: true }).withMessage("ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://");
}

export function textBody(field, { max = 200, required = false } = {}) {
  const chain = body(field);
  if (!required) chain.optional({ values: "falsy" });
  return chain
    .isString().withMessage(`${field} must be text`).bail()
    .trim()
    .isLength({ min: required ? 1 : 0, max }).withMessage(required ? `${field} is required and at most ${max} characters` : `${field} must be at most ${max} characters`);
}
