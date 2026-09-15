import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Award, BookOpen, CalendarDays, ChevronDown, ClipboardList, LayoutDashboard, LogOut, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import "./UserMenu.css";

const DASHBOARD_BY_ROLE = {
  user: "/dashboard",
  family: "/family/dashboard",
  employer: "/employer/dashboard",
  admin: "/admin",
  counsellor: "/counsellor",
};

const ROLE_LABELS = {
  user: "ผู้หางาน",
  family: "ครอบครัว/ผู้ดูแล",
  employer: "นายจ้าง",
  admin: "ผู้ดูแลระบบ",
  counsellor: "บุคลากรทางการแพทย์",
};

const ROLE_LINKS = {
  user: [
    { to: "/my-applications", label: "ใบสมัครของฉัน", icon: ClipboardList },
    { to: "/weekly-checkin", label: "เช็คอินรายสัปดาห์", icon: CalendarDays },
    { to: "/learning", label: "บทเรียนและการฝึกฝน", icon: BookOpen },
    { to: "/streak", label: "ความก้าวหน้าและรางวัล", icon: Award },
  ],
  employer: [],
  admin: [],
  counsellor: [],
};

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    setOpen(false);
    navigate("/login");
  }

  const links = ROLE_LINKS[user.role] || [];

  return (
    <div className="user-menu" ref={containerRef}>
      <button type="button" className="user-menu-trigger" aria-label="เมนูบัญชีของฉัน" aria-expanded={open} onClick={() => setOpen((prev) => !prev)}>
        <span className="user-menu-avatar">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.name)}
        </span>
        <span className="user-menu-name">{user.name}</span>
        <ChevronDown size={16} className={`user-menu-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="user-menu-panel">
          <div className="user-menu-header">
            <p className="user-menu-header-name">{user.name}</p>
            <span className="user-menu-header-role">{ROLE_LABELS[user.role]}</span>
          </div>

          <Link to={DASHBOARD_BY_ROLE[user.role] || "/"} className="user-menu-item" onClick={() => setOpen(false)}>
            <LayoutDashboard size={16} />
            <span>แผงควบคุม</span>
          </Link>

          <Link to="/profile" className="user-menu-item" onClick={() => setOpen(false)}>
            <User size={16} />
            <span>โปรไฟล์ของฉัน</span>
          </Link>

          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="user-menu-item" onClick={() => setOpen(false)}>
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          ))}

          <button type="button" className="user-menu-item user-menu-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
