export const LINKS_BY_ROLE = {
  guest: [
    { to: "/", label: "หน้าหลัก", end: true },
    { to: "/jobs", label: "ค้นหางาน" },
    { to: "/about", label: "เกี่ยวกับเรา" },
  ],
  user: [
    { to: "/dashboard", label: "หน้าหลัก" },
    { to: "/jobs", label: "ค้นหางาน" },
    { to: "/counselling", label: "การให้คำปรึกษา" },
    { to: "/craving-tracker", label: "สุขภาพและระดับความเสี่ยง" },
    { to: "/community", label: "ชุมชนฟื้นฟู" },
    { to: "/courses", label: "ศูนย์การเรียนรู้" },
    { to: "/my-applications", label: "ใบสมัครของฉัน" },
    { to: "/weekly-checkin", label: "เช็คอินรายสัปดาห์" },
    { to: "/learning", label: "บทเรียนและการฝึกฝน" },
    { to: "/streak", label: "ความก้าวหน้าและรางวัล" },
    { to: "/about", label: "เกี่ยวกับเรา" },
  ],
  employer: [
    { to: "/employer/dashboard", label: "หน้าหลัก" },
    { to: "/jobs", label: "ค้นหางาน" },
    { to: "/employer/jobs", label: "ประกาศงานของฉัน" },
    { to: "/about", label: "เกี่ยวกับเรา" },
  ],
  counsellor: [
    { to: "/counsellor", label: "คำขอรับคำปรึกษา", end: true },
    { to: "/community", label: "ชุมชนฟื้นฟู" },
    { to: "/counsellor/courses", label: "จัดการคอร์สเรียน" },
    { to: "/counsellor/lessons", label: "จัดการทักษะปฏิเสธ" },
    { to: "/counsellor/analytics", label: "ภาพรวมผู้ใช้งาน" },
    { to: "/admin/posts-moderation", label: "ตรวจสอบโพสต์ที่ถูกรายงาน" },
    { to: "/about", label: "เกี่ยวกับเรา" },
  ],
  admin: [
    { to: "/admin", label: "หน้าหลัก", end: true },
    { to: "/admin/users", label: "จัดการผู้ใช้งาน" },
    { to: "/admin/jobs", label: "ตรวจสอบประกาศงาน" },
    { to: "/admin/job-categories", label: "หมวดหมู่งาน" },
    { to: "/admin/assessments", label: "ผลประเมินความเสี่ยง" },
    { to: "/admin/posts-moderation", label: "ตรวจสอบโพสต์ที่ถูกรายงาน" },
    { to: "/about", label: "เกี่ยวกับเรา" },
  ],
};

export function getNavLinks(user, isAuthenticated) {
  return isAuthenticated ? LINKS_BY_ROLE[user.role] || LINKS_BY_ROLE.guest : LINKS_BY_ROLE.guest;
}
