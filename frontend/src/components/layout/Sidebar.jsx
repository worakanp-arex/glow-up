import { NavLink } from "react-router-dom";
import { LayoutDashboard, Briefcase, HeartHandshake, Activity, Users, BookOpen, CalendarCheck, Award, FileText, ShieldCheck, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { getNavLinks } from "./navLinks.js";
const icons = { "/dashboard": LayoutDashboard, "/jobs": Briefcase, "/counselling": HeartHandshake, "/craving-tracker": Activity, "/community": Users, "/courses": BookOpen };
export default function Sidebar() {
  const { user } = useAuth();
  const links = getNavLinks(user, true);
  const extras = user.role === "user" ? [
    { to: "/my-applications", label: "ใบสมัครของฉัน", icon: FileText },
    { to: "/weekly-checkin", label: "เช็คอินรายสัปดาห์", icon: CalendarCheck },
    { to: "/learning", label: "บทเรียนและการฝึกฝน", icon: BookOpen },
    { to: "/streak", label: "ความก้าวหน้าและรางวัล", icon: Award },
  ] : [];
  return <aside className="workspace-sidebar"><p className="sidebar-caption">พื้นที่ของคุณ</p>
    <nav aria-label="เมนูหลัก">{links.filter((link) => link.to !== "/about" && !extras.some((extra) => extra.to === link.to)).map(({ to, label, end }) => {
      const Icon = icons[to] || LayoutDashboard;
      return <NavLink key={to} to={to} end={end} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}><Icon size={18} /><span>{label}</span><ChevronRight className="sidebar-arrow" size={14} /></NavLink>;
    })}</nav>
    {extras.length > 0 && <><p className="sidebar-caption">ก้าวต่อไปด้วยกัน</p><nav aria-label="กิจกรรมของฉัน">{extras.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}><Icon size={18} /><span>{label}</span></NavLink>)}</nav></>}
    <div className="sidebar-note"><ShieldCheck size={22} /><strong>ทุกก้าวเล็ก ๆ มีความหมาย</strong><p>ค่อย ๆ เดินไปในจังหวะของคุณ เราพร้อมอยู่ข้าง ๆ</p><NavLink to="/about">รู้จัก glow-up <ChevronRight size={14} /></NavLink></div>
  </aside>;
}
