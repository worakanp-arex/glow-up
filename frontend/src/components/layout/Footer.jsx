import { Link } from "react-router-dom";
import { Mail, MapPin } from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { roleHome, canSearchJobs } from "../../constants/roleHome.js";
import PartnerBadge from "../common/PartnerBadge.jsx";
import { PARTNERS } from "../../constants/partners.js";
import "./Footer.css";

// Footer links only point at pages the visitor's role can open.
const MORE_LINKS_BY_ROLE = {
  guest: [
    { to: "/community", label: "ชุมชนฟื้นฟู" },
    { to: "/courses", label: "ศูนย์การเรียนรู้" },
    { to: "/employer/dashboard", label: "สำหรับนายจ้าง" },
  ],
  user: [
    { to: "/community", label: "ชุมชนฟื้นฟู" },
    { to: "/courses", label: "ศูนย์การเรียนรู้" },
    { to: "/counselling", label: "การให้คำปรึกษา" },
  ],
  employer: [
    { to: "/employer/jobs", label: "ประกาศงานของฉัน" },
    { to: "/community", label: "ชุมชนฟื้นฟู" },
    { to: "/courses", label: "ศูนย์การเรียนรู้" },
  ],
  family: [
    { to: "/community", label: "ชุมชนฟื้นฟู" },
    { to: "/family/guide", label: "คู่มือสำหรับครอบครัว" },
    { to: "/courses", label: "ศูนย์การเรียนรู้" },
  ],
  counsellor: [
    { to: "/counsellor/courses", label: "จัดการคอร์สเรียน" },
    { to: "/counsellor/analytics", label: "ภาพรวมผู้ใช้งาน" },
    { to: "/community", label: "ชุมชนฟื้นฟู" },
  ],
  admin: [
    { to: "/admin/users", label: "จัดการผู้ใช้งาน" },
    { to: "/admin/posts-moderation", label: "ตรวจสอบโพสต์" },
    { to: "/community", label: "ชุมชนฟื้นฟู" },
  ],
};

function Footer() {
  const { theme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const mainLinks = [
    { to: isAuthenticated ? roleHome(user.role) : "/", label: "หน้าหลัก" },
    ...(canSearchJobs(user, isAuthenticated) ? [{ to: "/jobs", label: "ค้นหางาน" }] : []),
    { to: "/about", label: "เกี่ยวกับเรา" },
    isAuthenticated ? { to: "/profile", label: "โปรไฟล์ของฉัน" } : { to: "/register", label: "สมัครสมาชิก" },
  ];
  const moreLinks = MORE_LINKS_BY_ROLE[isAuthenticated ? user.role : "guest"] || MORE_LINKS_BY_ROLE.guest;
  const year = new Date().getFullYear();
  const logoSrc = theme === "dark" ? "/logoW.png" : "/logo.png";

  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="footer-col footer-brand">
          <img className="footer-brand-logo" src={logoSrc} alt="Grow Up" />
          <p>
            พื้นที่ที่เชื่อมผู้ผ่านการบำบัดเข้ากับโอกาสการทำงานจริง ด้วยการจับคู่ทักษะอย่างเป็นธรรม
            และดูแลความเป็นส่วนตัวของคุณเป็นอันดับแรก
          </p>
        </div>

        <div className="footer-col">
          <h3>เมนูหลัก</h3>
          <ul>
            {mainLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h3>เมนูอื่นๆ</h3>
          <ul>
            {moreLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h3>ติดต่อเรา</h3>
          <ul className="footer-contact">
            <li>
              <Mail size={16} />
              <a href="mailto:worakan.p@kkumail.com">worakan.p@kkumail.com</a>
            </li>
            <li>
              <MapPin size={16} />
              <span>วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น อ.เมือง จ.ขอนแก่น 40002</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-partners">
        <p className="footer-partners-label">พันธมิตรโครงการ</p>
        <div className="footer-partners-row">
          {PARTNERS.map((partner) => (
            <Link key={partner.id} to={`/about#${partner.id}`} className="footer-partner-item">
              <PartnerBadge partner={partner} size="sm" />
              <span>{partner.shortName}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="footer-bottom">
        <img className="footer-bottom-logo" src={logoSrc} alt="Grow Up" />
        <p>&copy; {year} Grow Up — โครงการสนับสนุนโอกาสการทำงาน สำหรับผู้ผ่านการบำบัด</p>
      </div>
    </footer>
  );
}

export default Footer;
