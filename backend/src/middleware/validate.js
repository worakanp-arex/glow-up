import { validationResult } from "express-validator";

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // บอกเพียงว่าฟิลด์ไหนผิดและเพราะอะไร express-validator ยังพก
    // `value` ที่ส่งมาด้วย ซึ่งในเส้นทาง auth คือรหัสผ่าน
    return res.status(400).json({
      errors: errors.array().map(({ msg, path, location, type }) => ({ type, msg, path, location })),
    });
  }
  next();
}
