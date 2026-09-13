import { ArrowLeft, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import "./PageHeader.css";

export default function PageHeader({ children, icon: Icon = FileText, description, backTo, backLabel, onBack, actions, variant = "default" }) {
  return (
    <header className={`page-header page-header-${variant}`}>
      {(backTo || onBack) && (
        backTo ? <Link className="page-back" to={backTo} aria-label={backLabel ? `ย้อนกลับไป${backLabel}` : "ย้อนกลับ"}>
          <ArrowLeft size={16} aria-hidden="true" /><span>ย้อนกลับ</span>
        </Link> : <button className="page-back" type="button" onClick={onBack} aria-label={backLabel ? `ย้อนกลับไป${backLabel}` : "ย้อนกลับ"}>
          <ArrowLeft size={16} aria-hidden="true" /><span>ย้อนกลับ</span>
        </button>
      )}
      <div className="page-header-row">
        <div className="page-heading">
          <span className="page-heading-icon" aria-hidden="true"><Icon size={22} /></span>
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
