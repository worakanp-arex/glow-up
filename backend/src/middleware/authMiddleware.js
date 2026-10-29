import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ฟิลด์ที่การตรวจเซสชันต้องใช้ `passwordChangedAt` ถูกซ่อนจากการอ่านปกติ
export const SESSION_USER_FIELDS = "role verifiedStatus +passwordChangedAt";

// ตัดสินว่า token ที่ลงนามแล้วยังเข้าได้หรือไม่ โดยดูบัญชี ณ *ปัจจุบัน*:
// token อย่างเดียวไม่พอ เพราะบัญชีอาจถูกลบ ระงับ ถอนการยืนยัน
// หรือเปลี่ยนรหัสผ่านหลังจากออก token ใช้ร่วมกันระหว่าง REST middleware
// และ socket handshake เพื่อให้ปิดประตูพร้อมกัน
// คืน null เพื่อให้คำขอผ่านไป มิฉะนั้นคืน response ที่ต้องส่ง
export function sessionRejection(claims, user) {
  if (!user) return { status: 401, message: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  if (user.verifiedStatus === "suspended") {
    return { status: 403, message: "บัญชีของคุณถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ" };
  }
  // เจ้าหน้าที่ที่แอดมินถอนการยืนยันต้องเข้าถึงข้อมูลผู้ป่วยไม่ได้อีก
  // (นายจ้างถูกควบคุมแยกต่างหากในจุดที่แตะข้อมูลผู้สมัคร)
  if (user.verifiedStatus === "rejected" && (user.role === "admin" || user.role === "counsellor")) {
    return { status: 403, message: "บัญชีของคุณไม่ผ่านการยืนยันตัวตน กรุณาติดต่อผู้ดูแลระบบ" };
  }
  // `iat` เป็นหน่วยวินาที จึงเทียบที่ความละเอียดนั้น: token ที่ออกใน
  // วินาทีเดียวกับการเปลี่ยนรหัส (ตัวใหม่ที่ change-password ส่งให้)
  // ยอมรับได้ ส่วนตัวก่อนหน้านั้นทั้งหมดไม่ยอมรับ
  if (user.passwordChangedAt && claims.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    return { status: 401, message: "รหัสผ่านถูกเปลี่ยนแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  }
  return null;
}

export async function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  const headerToken = header && header.startsWith("Bearer ") ? header.slice(7) : null;
  const token = headerToken || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    const user = await User.findById(claims.id).select(SESSION_USER_FIELDS);
    const rejection = sessionRejection(claims, user);
    if (rejection) return res.status(rejection.status).json({ message: rejection.message });
    req.user = { id: claims.id, role: user.role };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
