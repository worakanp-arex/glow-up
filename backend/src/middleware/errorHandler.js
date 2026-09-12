export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: "มีรายการนี้อยู่แล้ว กรุณาโหลดข้อมูลอีกครั้ง" });
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }
  if (err.name === "MulterError" || err.message?.startsWith("Invalid file type")) {
    return res.status(400).json({ message: err.message });
  }
  res.status(err.status || 500).json({ message: process.env.NODE_ENV === "production" ? "ระบบไม่สามารถทำรายการได้ กรุณาลองอีกครั้ง" : err.message || "Server error" });
}
