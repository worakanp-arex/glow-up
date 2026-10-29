import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookHeart, HeartHandshake } from "lucide-react";
import Avatar from "../common/Avatar.jsx";
import * as familyService from "../../services/familyService.js";
import "./AccountCard.css";

// สำหรับบัญชีครอบครัว: แสดงว่าติดตามใครอยู่ พร้อมทางลัดไปหน้าครอบครัว
export default function FamilyConnectionsCard() {
  const [links, setLinks] = useState(null);

  useEffect(() => {
    familyService.getMyFamilyLinks().then((data) => setLinks(Array.isArray(data) ? data : [])).catch(() => setLinks([]));
  }, []);

  return (
    <section className="ui-card account-card">
      <div className="ui-card-head">
        <h2>คนที่ฉันติดตาม</h2>
        <HeartHandshake size={18} aria-hidden="true" />
      </div>
      {links === null ? (
        <p className="ui-muted">กำลังโหลด...</p>
      ) : links.length === 0 ? (
        <p className="ui-muted">ยังไม่ได้เชื่อมต่อกับใคร ขอเชื่อมต่อด้วยอีเมลได้ที่หน้าติดตามครอบครัว</p>
      ) : (
        <ul className="account-card-links">
          {links.map((link) => (
            <li key={link._id}>
              <Avatar user={link.recoveringUser} size={36} />
              <span>
                <strong>{link.recoveringUser?.name}</strong>
                {link.recoveringUser?.familyName && <small>{link.recoveringUser.familyName}</small>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="account-card-shortcuts">
        <Link to="/family/dashboard" className="ui-btn ui-btn-outline"><HeartHandshake size={15} aria-hidden="true" />หน้าติดตามครอบครัว</Link>
        <Link to="/family/guide" className="ui-btn ui-btn-outline"><BookHeart size={15} aria-hidden="true" />คู่มือสำหรับครอบครัว</Link>
      </div>
    </section>
  );
}
