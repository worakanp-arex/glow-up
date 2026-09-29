// Roles a staff author can target a community post at. An empty
// visibleToRoles array on the post means "everyone".
export const AUDIENCE_ROLES = [
  { value: "user", label: "ผู้ใช้งาน (ผู้ผ่านการบำบัด)" },
  { value: "family", label: "ครอบครัว/ผู้ดูแล" },
  { value: "employer", label: "นายจ้าง" },
];

export const AUDIENCE_LABEL_BY_VALUE = Object.fromEntries(AUDIENCE_ROLES.map(({ value, label }) => [value, label]));
