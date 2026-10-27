// One place for how passwords are accepted and hashed, so registration, reset,
// change and the admin tools can't drift apart.

// bcrypt's cost is stored inside every hash, so raising it never locks out
// existing accounts — their older hashes keep verifying.
export const BCRYPT_COST = 12;

export const PASSWORD_MIN_LENGTH = 10;
// bcrypt ignores everything past 72 bytes; this keeps the request (and the CPU
// work per attempt) bounded without cutting off a long passphrase.
export const PASSWORD_MAX_LENGTH = 128;

// Passwords that appear in every leaked-password list. Anything shorter than the
// minimum is already refused, so only entries long enough to matter are listed.
const COMMON_PASSWORDS = new Set([
  "1234567890", "0123456789", "12345678910", "123456789a", "1234512345", "9876543210", "0987654321",
  "qwertyuiop", "qwerty1234", "qwerty12345", "asdfghjkl1", "1q2w3e4r5t", "1qaz2wsx3edc", "zxcvbnm123",
  "password12", "password123", "password1234", "passw0rd12", "p@ssword12", "p@ssw0rd12", "password!1",
  "iloveyou12", "iloveyou123", "welcome123", "welcome1234", "letmein1234", "admin12345", "admin123456",
  "monkey1234", "dragon1234", "superman12", "football12", "baseball12", "abcdefghij", "abcd123456",
  "growup1234", "glowup1234", "growup12345", "glowup12345", "0000000000", "1111111111", "1234567891",
]);

// Returns a message for a password that must be refused, or null when it is fine.
export function passwordProblem(password) {
  if (typeof password !== "string") return "รหัสผ่านต้องเป็นข้อความ";
  if (password.length < PASSWORD_MIN_LENGTH) return `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`;
  if (password.length > PASSWORD_MAX_LENGTH) return `รหัสผ่านต้องยาวไม่เกิน ${PASSWORD_MAX_LENGTH} ตัวอักษร`;
  if (new Set(password).size < 4 || COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "รหัสผ่านนี้เดาง่ายเกินไป กรุณาเลือกรหัสผ่านอื่น";
  }
  return null;
}
