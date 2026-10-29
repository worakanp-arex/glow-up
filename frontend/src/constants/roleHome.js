// หน้าที่แต่ละบทบาทไปถึงหลังล็อกอิน และเมื่อออกจากหน้าที่ใช้ไม่ได้
export const ROLE_HOME = {
  user: "/dashboard",
  family: "/family/dashboard",
  employer: "/employer/dashboard",
  counsellor: "/counsellor",
  admin: "/admin",
};

export function roleHome(role) {
  return ROLE_HOME[role] || "/";
}

// กระดานงานสำหรับผู้เยี่ยมชม ผู้หางาน และนายจ้าง บัญชีเจ้าหน้าที่
// และครอบครัวไม่เห็นลิงก์ค้นหางาน
export function canSearchJobs(user, isAuthenticated) {
  return !isAuthenticated || ["user", "employer"].includes(user?.role);
}
