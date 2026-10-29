const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

// ป้องกันหลายชั้น (defence in depth) เสริมจาก cookie ล็อกอิน SameSite=Lax: เบราว์เซอร์
// บอกเสมอว่าคำขอสร้าง/แก้ไข/ลบมาจากเว็บไหน จึงปฏิเสธคำขอที่ไม่ได้
// มาจาก front end ของเรา ไคลเอนต์ที่ไม่ส่ง Origin (curl,
// เซิร์ฟเวอร์ต่อเซิร์ฟเวอร์, ชุดทดสอบ) ไม่ใช่เบราว์เซอร์ที่กระทำแทนใคร จึงผ่านได้
export function requireOwnOrigin(allowedOrigin) {
  return function checkOrigin(req, res, next) {
    if (SAFE_METHODS.includes(req.method)) return next();
    const { origin } = req.headers;
    if (origin && origin !== allowedOrigin) {
      return res.status(403).json({ message: "Origin not allowed" });
    }
    next();
  };
}
