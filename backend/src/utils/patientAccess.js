import User from "../models/User.js";
import CounsellingSession from "../models/CounsellingSession.js";

// กำหนดสิทธิ์ผู้ให้คำปรึกษาเข้าถึงรายละเอียดทางคลินิกของผู้ป่วย (ประวัติการบำบัด
// ผลประเมินความเสี่ยง บันทึกอารมณ์ เหตุการณ์เสี่ยงจริง แบบประเมินรายสัปดาห์) —
// แอดมินข้ามการตรวจนี้ที่จุดเรียกใช้ ผู้ให้คำปรึกษาดูผู้ป่วยได้
// เมื่อเป็นผู้รับผิดชอบ หรือเคยมี session ปรึกษากับผู้ป่วยรายนั้น
// (ครอบคลุมการรับเคสก่อนมี assignedCounsellor
// โดยไม่ต้องทำ migration เติมข้อมูลย้อนหลัง)
export async function counsellorCanAccessPatient(counsellorId, targetUserId) {
  const [target, hasSession] = await Promise.all([
    User.findById(targetUserId).select("assignedCounsellor"),
    CounsellingSession.exists({ user: targetUserId, counsellor: counsellorId }),
  ]);
  if (target?.assignedCounsellor && String(target.assignedCounsellor) === String(counsellorId)) return true;
  return Boolean(hasSession);
}

// คิวตรวจร่วม (เช่น การอนุมัติกิจกรรม) แจ้งผู้ให้คำปรึกษาทุกคน
// ผู้ป่วยที่ยังไม่มีผู้ดูแลจึงต้องยังตรวจได้ ไม่เช่นนั้นงานที่ส่งมา
// จะค้าง ใน `userIds` คืนรายที่ผู้ให้คำปรึกษาคนนี้ตรวจได้:
// ผู้ป่วยที่เข้าถึงได้บวกผู้ป่วยที่ยังไม่มีผู้ให้คำปรึกษา
// ผู้ป่วยที่เป็นของผู้ให้คำปรึกษาคนอื่นจะถูกตัดออก
export async function reviewablePatientIds(counsellorId, userIds) {
  if (userIds.length === 0) return new Set();
  const [assignedToMe, unassigned, hadSessionWithMe] = await Promise.all([
    User.find({ _id: { $in: userIds }, assignedCounsellor: counsellorId }).select("_id"),
    User.find({ _id: { $in: userIds }, assignedCounsellor: null }).select("_id"),
    CounsellingSession.distinct("user", { counsellor: counsellorId, user: { $in: userIds } }),
  ]);
  return new Set([...assignedToMe.map((u) => String(u._id)), ...unassigned.map((u) => String(u._id)), ...hadSessionWithMe.map(String)]);
}
