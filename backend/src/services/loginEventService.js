import LoginEvent from "../models/LoginEvent.js";
import { toBangkokDateKey } from "../utils/dateKey.js";

// ทุกบัญชีนับเป็น "ผู้ใช้งาน" ในภาพรวม — ผู้ป่วย สมาชิกครอบครัว
// บุคลากรทางการแพทย์ นายจ้าง และแอดมิน
export async function recordLogin(user) {
  const dateKey = toBangkokDateKey(new Date());
  await LoginEvent.updateOne({ user: user._id, dateKey }, {}, { upsert: true });
}
