import { isProductionLike } from "../config/env.js";

export function errorHandler(err, req, res, next) {
  // Log the failure, not the whole error object: Mongoose attaches the offending
  // values (which can be a patient's notes) to validation and cast errors.
  console.error(`[${req.method} ${req.path}]`, err.name || "Error", "-", err.message);
  if (err.stack && !isProductionLike()) console.error(err.stack);
  if (err.code === "EMAIL_DELIVERY_FAILED") {
    return res.status(503).json({ message: "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่อีกครั้งภายหลัง หรือติดต่อผู้ดูแลระบบ" });
  }
  if (err.code === 11000) return res.status(409).json({ message: "มีรายการนี้อยู่แล้ว กรุณาโหลดข้อมูลอีกครั้ง" });
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }
  if (err.name === "MulterError" || err.message?.startsWith("Invalid file type")) {
    return res.status(400).json({ message: err.message });
  }
  res.status(err.status || 500).json({ message: isProductionLike() ? "ระบบไม่สามารถทำรายการได้ กรุณาลองอีกครั้ง" : err.message || "Server error" });
}
