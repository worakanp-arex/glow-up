// ที่เดียวที่กำหนดวิธีรับและแฮชรหัสผ่าน เพื่อให้การสมัคร รีเซ็ต
// เปลี่ยน และเครื่องมือของแอดมินไม่เบี่ยงเบนจากกัน

// ค่า cost ของ bcrypt ถูกเก็บอยู่ในแฮชทุกตัว การเพิ่มค่าจึงไม่ทำให้
// บัญชีเดิมเข้าไม่ได้ — แฮชเก่ายังตรวจสอบผ่านต่อไป
export const BCRYPT_COST = 12;

export const PASSWORD_MIN_LENGTH = 10;
// bcrypt เมินทุกอย่างหลัง 72 ไบต์ ค่านี้จำกัดคำขอ (และงาน CPU ต่อความพยายาม)
// โดยไม่ตัดวลีรหัสผ่านที่ยาว
export const PASSWORD_MAX_LENGTH = 128;

// รหัสผ่านที่ปรากฏในรายการรหัสผ่านที่รั่วไหลทุกรายการ สิ่งที่สั้นกว่า
// ขั้นต่ำถูกปฏิเสธอยู่แล้ว จึงระบุเฉพาะรายการที่ยาวพอจะมีความหมาย
const COMMON_PASSWORDS = new Set([
  "1234567890", "0123456789", "12345678910", "123456789a", "1234512345", "9876543210", "0987654321",
  "qwertyuiop", "qwerty1234", "qwerty12345", "asdfghjkl1", "1q2w3e4r5t", "1qaz2wsx3edc", "zxcvbnm123",
  "password12", "password123", "password1234", "passw0rd12", "p@ssword12", "p@ssw0rd12", "password!1",
  "iloveyou12", "iloveyou123", "welcome123", "welcome1234", "letmein1234", "admin12345", "admin123456",
  "monkey1234", "dragon1234", "superman12", "football12", "baseball12", "abcdefghij", "abcd123456",
  "growup1234", "glowup1234", "growup12345", "glowup12345", "0000000000", "1111111111", "1234567891",
]);

// คืนข้อความสำหรับรหัสผ่านที่ต้องปฏิเสธ หรือ null เมื่อใช้ได้
export function passwordProblem(password) {
  if (typeof password !== "string") return "รหัสผ่านต้องเป็นข้อความ";
  if (password.length < PASSWORD_MIN_LENGTH) return `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`;
  if (password.length > PASSWORD_MAX_LENGTH) return `รหัสผ่านต้องยาวไม่เกิน ${PASSWORD_MAX_LENGTH} ตัวอักษร`;
  if (new Set(password).size < 4 || COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "รหัสผ่านนี้เดาง่ายเกินไป กรุณาเลือกรหัสผ่านอื่น";
  }
  return null;
}
