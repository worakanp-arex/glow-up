import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import "./SecondaryNav.css";

const LINKS_BY_ROLE = {
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
    { to: "/counsellor/analytics", label: "ภาพรวมผู้ใช้งาน" },
    { to: "/about", label: "เกี่ยวกับเรา" },
  ],
  admin: [
    { to: "/admin", label: "หน้าหลัก", end: true },
    { to: "/admin/users", label: "จัดการผู้ใช้งาน" },
    { to: "/admin/jobs", label: "ตรวจสอบประกาศงาน" },
    { to: "/admin/job-categories", label: "หมวดหมู่งาน" },
    { to: "/admin/assessments", label: "ผลประเมินความเสี่ยง" },
    { to: "/about", label: "เกี่ยวกับเรา" },
  ],
};

function SecondaryNav() {
  const { user, isAuthenticated } = useAuth();
  const links = isAuthenticated ? LINKS_BY_ROLE[user.role] || LINKS_BY_ROLE.guest : LINKS_BY_ROLE.guest;

  return (
    <nav className="secondary-nav">
      <div className="secondary-nav-inner">
        {links.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `secondary-nav-link${isActive ? " active" : ""}`}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default SecondaryNav;
