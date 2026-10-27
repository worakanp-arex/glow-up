import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Fields the session check needs; `passwordChangedAt` is hidden from normal reads.
export const SESSION_USER_FIELDS = "role verifiedStatus +passwordChangedAt";

// Decides whether a signed token still gets in, given the account as it is
// *now*: a token alone is not enough, because the account may have been
// removed, suspended, had its verification withdrawn, or changed its password
// since the token was issued. Shared by the REST middleware and the socket
// handshake so both close the door at the same moment.
// Returns null to let the request through, otherwise the response to send.
export function sessionRejection(claims, user) {
  if (!user) return { status: 401, message: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  if (user.verifiedStatus === "suspended") {
    return { status: 403, message: "บัญชีของคุณถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ" };
  }
  // Staff whose verification an admin withdrew must stop reaching patient data
  // (employers are gated separately where they touch applicant data).
  if (user.verifiedStatus === "rejected" && (user.role === "admin" || user.role === "counsellor")) {
    return { status: 403, message: "บัญชีของคุณไม่ผ่านการยืนยันตัวตน กรุณาติดต่อผู้ดูแลระบบ" };
  }
  // `iat` is in whole seconds, so compare at that resolution: a token issued in
  // the same second as the change (the fresh one handed out by change-password)
  // is accepted, every earlier one is not.
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
