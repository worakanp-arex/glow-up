import {
  BarChart3,
  BookOpen,
  Briefcase,
  Flag,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  MessagesSquare,
  ShieldAlert,
  Tags,
  Target,
  UserCircle,
  Users,
  FileSearch,
} from "lucide-react";

// `icon` and `group` are used by the left side navigation (admin and
// counsellor only); every other role keeps the horizontal bar and ignores them.
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
    { to: "/games", label: "เกมฟื้นฟู" },
    { to: "/about", label: "เกี่ยวกับเรา" },
  ],
  family: [
    { to: "/family/dashboard", label: "ติดตามครอบครัว" },
    { to: "/family/guide", label: "คู่มือสำหรับครอบครัว" },
    { to: "/community", label: "ชุมชนฟื้นฟู" },
    { to: "/profile", label: "โปรไฟล์ของฉัน" },
    { to: "/about", label: "เกี่ยวกับเรา" },
  ],
  employer: [
    { to: "/employer/dashboard", label: "หน้าหลัก" },
    { to: "/jobs", label: "ค้นหางาน" },
    { to: "/employer/jobs", label: "ประกาศงานของฉัน" },
    { to: "/about", label: "เกี่ยวกับเรา" },
  ],
  counsellor: [
    { to: "/counsellor", label: "คำขอรับคำปรึกษา", end: true, icon: MessageCircle, group: "การให้คำปรึกษา" },
    { to: "/counsellor/analytics", label: "ภาพรวมผู้ใช้งาน", icon: BarChart3, group: "การให้คำปรึกษา" },
    { to: "/counsellor/courses", label: "จัดการคอร์สเรียน", icon: GraduationCap, group: "เนื้อหาและภารกิจ" },
    { to: "/counsellor/activity-missions", label: "จัดการภารกิจประจำวัน", icon: ListChecks, group: "เนื้อหาและภารกิจ" },
    { to: "/counsellor/lessons", label: "จัดการทักษะปฏิเสธ", icon: BookOpen, group: "เนื้อหาและภารกิจ" },
    { to: "/community", label: "ชุมชนฟื้นฟู", icon: MessagesSquare, group: "ชุมชน" },
    { to: "/admin/posts-moderation", label: "ตรวจสอบโพสต์ที่ถูกรายงาน", icon: Flag, group: "ชุมชน" },
    { to: "/profile", label: "โปรไฟล์ของฉัน", icon: UserCircle, group: "บัญชี" },
    { to: "/about", label: "เกี่ยวกับเรา" },
  ],
  admin: [
    { to: "/admin", label: "หน้าหลัก", end: true, icon: LayoutDashboard, group: "ภาพรวม" },
    { to: "/counsellor/analytics", label: "ภาพรวมผู้ใช้งาน", icon: BarChart3, group: "ภาพรวม" },
    { to: "/admin/assessments", label: "ผลประเมินความเสี่ยง", icon: ShieldAlert, group: "ภาพรวม" },
    { to: "/admin/users", label: "จัดการผู้ใช้งาน", icon: Users, group: "ผู้ใช้และงาน" },
    { to: "/admin/jobs", label: "ตรวจสอบประกาศงาน", icon: Briefcase, group: "ผู้ใช้และงาน" },
    { to: "/admin/applications", label: "ใบสมัครงานทั้งหมด", icon: FileSearch, group: "ผู้ใช้และงาน" },
    { to: "/admin/job-categories", label: "หมวดหมู่งาน", icon: Tags, group: "ผู้ใช้และงาน" },
    { to: "/admin/missions", label: "จัดการภารกิจและรางวัล", icon: Target, group: "ภารกิจและเนื้อหา" },
    { to: "/counsellor/activity-missions", label: "จัดการภารกิจประจำวัน", icon: ListChecks, group: "ภารกิจและเนื้อหา" },
    { to: "/community", label: "ชุมชนฟื้นฟู", icon: MessagesSquare, group: "ชุมชน" },
    { to: "/admin/posts-moderation", label: "ตรวจสอบโพสต์ที่ถูกรายงาน", icon: Flag, group: "ชุมชน" },
    { to: "/profile", label: "โปรไฟล์ของฉัน", icon: UserCircle, group: "บัญชี" },
    { to: "/about", label: "เกี่ยวกับเรา" },
  ],
};

// Admin and counsellor have many menu items, so they get a left side
// navigation (white, dark text) instead of the horizontal bar.
const SIDEBAR_ROLES = ["admin", "counsellor"];

export function usesSidebar(user, isAuthenticated) {
  return Boolean(isAuthenticated && user && SIDEBAR_ROLES.includes(user.role));
}

export function getNavLinks(user, isAuthenticated) {
  return isAuthenticated ? LINKS_BY_ROLE[user.role] || LINKS_BY_ROLE.guest : LINKS_BY_ROLE.guest;
}
