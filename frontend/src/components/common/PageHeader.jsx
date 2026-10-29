import { ArrowLeft, FileText } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./PageHeader.css";

export default function PageHeader({ children, icon: Icon = FileText, eyebrow, description, backTo, backLabel, onBack, actions, art, variant = "default" }) {
  const location = useLocation();
  const navigate = useNavigate();

  // ปุ่มย้อนกลับหมายถึง "หน้าที่เพิ่งมา" ไม่ว่าหน้านั้นจะเป็นหน้าไหน `backTo`
  // เป็นเพียงค่าสำรองเมื่อไม่มีหน้าก่อนหน้าในแอปให้กลับ
  // (ลิงก์ที่วางมา แท็บใหม่ การแจ้งเตือน) และเก็บเป็น href ของลิงก์
  function goBack(event) {
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
    if (modified || location.key === "default") return;
    event.preventDefault();
    navigate(-1);
  }

  return (
    <header className={`page-header page-header-${variant}${eyebrow ? " has-eyebrow" : ""}${art ? " has-art" : ""}`}>
      {art && <img className="page-header-art" src={`/images/illustrations/${art}.webp`} alt="" width="88" height="88" />}
      {(backTo || onBack) && (
        backTo ? <Link className="page-back" to={backTo} onClick={goBack} aria-label={backLabel ? `ย้อนกลับไป${backLabel}` : "ย้อนกลับ"}>
          <ArrowLeft size={16} aria-hidden="true" /><span>ย้อนกลับ</span>
        </Link> : <button className="page-back" type="button" onClick={onBack} aria-label={backLabel ? `ย้อนกลับไป${backLabel}` : "ย้อนกลับ"}>
          <ArrowLeft size={16} aria-hidden="true" /><span>ย้อนกลับ</span>
        </button>
      )}
      <div className="page-header-row">
        <div className="page-heading">
          <p className="page-eyebrow">
            <span className="page-heading-icon" aria-hidden="true"><Icon size={22} /></span>
            {eyebrow && <span className="page-eyebrow-text">{eyebrow}</span>}
          </p>
          <div className="page-heading-copy">
            <h1 className="page-title">{children}</h1>
            {description && <p className="page-description">{description}</p>}
          </div>
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </header>
  );
}
