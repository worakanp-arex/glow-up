import {
  Award,
  BarChart3,
  BookHeart,
  BookOpen,
  Briefcase,
  ClipboardCheck,
  Flag,
  Gamepad2,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  House,
  Info,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  MessagesSquare,
  Search,
  ShieldAlert,
  Tags,
  Target,
  UserCircle,
  Users,
  FileSearch,
  FileText,
  Archive,
} from "lucide-react";

// `icon` แสดงข้างลิงก์แต่ละรายการในเมนูมือถือ (แฮมเบอร์เกอร์) และเมนูด้านข้าง
// `group` ใช้เฉพาะเมนูด้านข้างซ้าย (แอดมินและผู้ให้คำปรึกษา)
// บทบาทอื่นใช้แถบแนวนอนและไม่สนใจค่านี้
export const LINKS_BY_ROLE = {
  guest: [
    { to: "/", label: "หน้าหลัก", end: true, icon: House },
    { to: "/jobs", label: "ค้นหางาน", icon: Search },
    { to: "/about", label: "เกี่ยวกับเรา", icon: Info },
  ],
  user: [
    { to: "/dashboard", label: "หน้าหลัก", icon: House },
    { to: "/jobs", label: "ค้นหางาน", icon: Search },
    { to: "/counselling", label: "การให้คำปรึกษา", icon: MessageCircle },
    { to: "/craving-tracker", label: "สุขภาพและการดูแลใจ", icon: HeartPulse },
    { to: "/community", label: "ชุมชนฟื้นฟู", icon: MessagesSquare },
    { to: "/courses", label: "ศูนย์การเรียนรู้", icon: GraduationCap },
    { to: "/my-applications", label: "ใบสมัครของฉัน", icon: FileText },
    { to: "/weekly-checkin", label: "เช็คอินรายสัปดาห์", icon: ClipboardCheck },
    { to: "/learning", label: "บทเรียนและการฝึกฝน", icon: BookOpen },
    { to: "/streak", label: "ความก้าวหน้าและรางวัล", icon: Award },
    { to: "/games", label: "เกมฟื้นฟู", icon: Gamepad2 },
    { to: "/about", label: "เกี่ยวกับเรา", icon: Info },
  ],
  family: [
    { to: "/family/dashboard", label: "ติดตามครอบครัว", icon: HeartHandshake },
    { to: "/family/guide", label: "คู่มือสำหรับครอบครัว", icon: BookHeart },
    { to: "/community", label: "ชุมชนฟื้นฟู", icon: MessagesSquare },
    { to: "/profile", label: "โปรไฟล์ของฉัน", icon: UserCircle },
    { to: "/about", label: "เกี่ยวกับเรา", icon: Info },
  ],
  employer: [
    { to: "/employer/dashboard", label: "หน้าหลัก", icon: House },
    { to: "/jobs", label: "ค้นหางาน", icon: Search },
    { to: "/employer/jobs", label: "ประกาศงานของฉัน", icon: Briefcase },
    { to: "/about", label: "เกี่ยวกับเรา", icon: Info },
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
    { to: "/about", label: "เกี่ยวกับเรา", icon: Info },
  ],
  admin: [
    { to: "/admin", label: "หน้าหลัก", end: true, icon: LayoutDashboard, group: "ภาพรวม" },
    { to: "/counsellor/analytics", label: "ภาพรวมผู้ใช้งาน", icon: BarChart3, group: "ภาพรวม" },
    { to: "/admin/assessments", label: "ผลประเมินความเสี่ยง", icon: ShieldAlert, group: "ภาพรวม" },
    { to: "/admin/users", label: "จัดการผู้ใช้งาน", icon: Users, group: "ผู้ใช้และงาน" },
    { to: "/admin/deleted-users", label: "บัญชีที่ถูกลบ", icon: Archive, group: "ผู้ใช้และงาน" },
    { to: "/admin/jobs", label: "ตรวจสอบประกาศงาน", icon: Briefcase, group: "ผู้ใช้และงาน" },
    { to: "/admin/applications", label: "ใบสมัครงานทั้งหมด", icon: FileSearch, group: "ผู้ใช้และงาน" },
    { to: "/admin/job-categories", label: "หมวดหมู่งาน", icon: Tags, group: "ผู้ใช้และงาน" },
    { to: "/admin/missions", label: "จัดการภารกิจและรางวัล", icon: Target, group: "ภารกิจและเนื้อหา" },
    { to: "/counsellor/activity-missions", label: "จัดการภารกิจประจำวัน", icon: ListChecks, group: "ภารกิจและเนื้อหา" },
    { to: "/community", label: "ชุมชนฟื้นฟู", icon: MessagesSquare, group: "ชุมชน" },
    { to: "/admin/posts-moderation", label: "ตรวจสอบโพสต์ที่ถูกรายงาน", icon: Flag, group: "ชุมชน" },
    { to: "/profile", label: "โปรไฟล์ของฉัน", icon: UserCircle, group: "บัญชี" },
    { to: "/about", label: "เกี่ยวกับเรา", icon: Info },
  ],
};

// แอดมินและผู้ให้คำปรึกษามีรายการเมนูมาก จึงใช้เมนูด้านข้างซ้าย
// (พื้นขาว ตัวอักษรเข้ม) แทนแถบแนวนอน
const SIDEBAR_ROLES = ["admin", "counsellor"];

export function usesSidebar(user, isAuthenticated) {
  return Boolean(isAuthenticated && user && SIDEBAR_ROLES.includes(user.role));
}

export function getNavLinks(user, isAuthenticated) {
  return isAuthenticated ? LINKS_BY_ROLE[user.role] || LINKS_BY_ROLE.guest : LINKS_BY_ROLE.guest;
}
