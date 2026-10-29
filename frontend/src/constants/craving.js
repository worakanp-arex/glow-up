// คำสำหรับแถบเลื่อนความอยาก 1–10 ใช้ทุกที่ที่แสดงตัวเลขกลับให้ผู้ใช้ดูเท่านั้น
// (ประวัติ สรุป) "8/10" เฉยๆ อ่านเหมือนเกรดที่ต้องไล่ตามหรือกลัว
// คำง่ายๆ ไม่กี่คำอธิบายความรู้สึกได้ดีกว่า
export function cravingWord(level) {
  if (level == null || Number.isNaN(Number(level))) return null;
  const value = Number(level);
  if (value <= 2) return "แทบไม่มี";
  if (value <= 4) return "เล็กน้อย";
  if (value <= 6) return "ปานกลาง";
  if (value <= 8) return "ค่อนข้างแรง";
  return "แรงมาก";
}
