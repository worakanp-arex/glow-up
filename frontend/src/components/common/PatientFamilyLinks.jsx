import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import * as familyService from "../../services/familyService.js";
import "./PatientFamilyLinks.css";

const STATUS_LABELS = { pending: "รอการตอบรับ", active: "ติดตามอยู่" };

export default function PatientFamilyLinks({ userId }) {
  const [links, setLinks] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    familyService
      .getFamilyLinksForUser(userId)
      .then((data) => {
        if (!cancelled) setLinks(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <section className="ui-card patient-family-links-card">
      <div className="ui-card-head">
        <div>
          <h2>ครอบครัวที่เชื่อมต่อ</h2>
          <p>สมาชิกครอบครัวที่ผู้ใช้เชิญและเชื่อมต่ออยู่ในขณะนี้</p>
        </div>
        <Users size={18} aria-hidden="true" />
      </div>

      {error && <p className="ui-muted">โหลดข้อมูลไม่สำเร็จ</p>}
      {!error && !links && <p className="ui-muted">กำลังโหลด...</p>}
      {links?.length === 0 && <p className="ui-muted">ยังไม่ได้เชื่อมต่อกับสมาชิกครอบครัว</p>}
      {links?.length > 0 && (
        <ul className="patient-family-links-list">
          {links.map((link) => (
            <li key={link._id}>
              <div>
                <strong>{link.familyUser?.name || link.inviteEmail}</strong>
                <small>{link.familyUser?.email || link.inviteEmail}</small>
              </div>
              <span className={`patient-family-links-status patient-family-links-status-${link.status}`}>
                {STATUS_LABELS[link.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
