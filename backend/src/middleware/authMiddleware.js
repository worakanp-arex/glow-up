import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  const headerToken = header && header.startsWith("Bearer ") ? header.slice(7) : null;
  const token = headerToken || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    const user = await User.findById(claims.id).select("role");
    if (!user) return res.status(401).json({ message: "กรุณาเข้าสู่ระบบอีกครั้ง" });
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
