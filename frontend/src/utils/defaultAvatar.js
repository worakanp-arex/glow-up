// ภาพประจำบทบาทที่แสดงเมื่อผู้ใช้ยังไม่ได้อัปโหลดรูปโปรไฟล์
// บัญชีนายจ้างและแอดมินใช้ตัวอักษรย่อ เพื่อให้บริษัทดูเป็น
// องค์กร ไม่ใช่ตัวละคร
const DEFAULT_AVATARS = {
  user: "/images/avatars/user.webp",
  counsellor: "/images/avatars/staff.webp",
  family: "/images/avatars/family.webp",
};

export function defaultAvatarSrc(role) {
  return DEFAULT_AVATARS[role] || null;
}
