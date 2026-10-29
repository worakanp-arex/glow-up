import { NavLink } from "react-router-dom";
import { Circle } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { getNavLinks } from "./navLinks.js";
import "./Sidebar.css";

// เมนูนำทางด้านซ้ายสำหรับบทบาทที่มีรายการเมนูมาก (แอดมิน ผู้ให้คำปรึกษา)
// ลิงก์จัดกลุ่มตาม `group` ตามลำดับที่ปรากฏใน navLinks.js
function Sidebar() {
  const { user, isAuthenticated } = useAuth();
  const links = getNavLinks(user, isAuthenticated).filter(({ group }) => group);
  const groups = [];
  for (const link of links) {
    let group = groups.find((item) => item.name === link.group);
    if (!group) groups.push((group = { name: link.group, links: [] }));
    group.links.push(link);
  }

  return (
    <nav className="side-nav" aria-label="เมนูหลัก">
      {groups.map((group) => (
        <div className="side-nav-group" key={group.name}>
          <p className="side-nav-heading">{group.name}</p>
          <ul>
            {group.links.map(({ to, label, end, icon: Icon = Circle }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={({ isActive }) => `side-nav-link${isActive ? " active" : ""}`}>
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default Sidebar;
