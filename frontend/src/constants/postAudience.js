// บทบาทที่เจ้าหน้าที่ผู้เขียนกำหนดกลุ่มเป้าหมายของโพสต์ชุมชนได้
// อาร์เรย์ visibleToRoles ที่ว่างบนโพสต์หมายถึง "ทุกคน"
export const AUDIENCE_ROLES = [
  { value: "user", label: "ผู้ใช้งาน (ผู้ผ่านการบำบัด)" },
  { value: "family", label: "ครอบครัว/ผู้ดูแล" },
  { value: "employer", label: "นายจ้าง" },
];

export const AUDIENCE_LABEL_BY_VALUE = Object.fromEntries(AUDIENCE_ROLES.map(({ value, label }) => [value, label]));
