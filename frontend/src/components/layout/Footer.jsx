import { Link } from "react-router-dom";
import { Mail, MapPin } from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";
import PartnerBadge from "../common/PartnerBadge.jsx";
import { PARTNERS } from "../../constants/partners.js";
import "./Footer.css";

const MAIN_LINKS = [
  { to: "/", label: "หน้าหลัก" },
  { to: "/jobs", label: "ค้นหางาน" },
  { to: "/about", label: "เกี่ยวกับเรา" },
  { to: "/register", label: "สมัครสมาชิก" },
];

const MORE_LINKS = [
  { to: "/community", label: "ชุมชนฟื้นฟู" },
  { to: "/courses", label: "ศูนย์การเรียนรู้" },
  { to: "/counselling", label: "การให้คำปรึกษา" },
  { to: "/employer/dashboard", label: "สำหรับนายจ้าง" },
];

function Footer() {
  const { theme } = useTheme();
  const year = new Date().getFullYear();
  const logoSrc = theme === "dark" ? "/logoW.png" : "/logo.png";

  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="footer-col footer-brand">
          <img className="footer-brand-logo" src={logoSrc} alt="glow-up" />
          <p>
            พื้นที่ที่เชื่อมผู้ผ่านการบำบัดเข้ากับโอกาสการทำงานจริง ด้วยการจับคู่ทักษะอย่างเป็นธรรม
            และดูแลความเป็นส่วนตัวของคุณเป็นอันดับแรก
          </p>
        </div>

        <div className="footer-col">
          <h3>เมนูหลัก</h3>
          <ul>
            {MAIN_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h3>เมนูอื่นๆ</h3>
          <ul>
            {MORE_LINKS.map((link) => (
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
              <a href="mailto:contact@glowup.kku.ac.th">contact@glowup.kku.ac.th</a>
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
        <img className="footer-bottom-logo" src={logoSrc} alt="glow-up" />
        <p>&copy; {year} glow-up — โครงการสนับสนุนโอกาสการทำงาน สำหรับผู้ผ่านการบำบัด</p>
      </div>
    </footer>
  );
}

export default Footer;
