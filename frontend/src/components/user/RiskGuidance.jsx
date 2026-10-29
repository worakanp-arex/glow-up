import { Link } from "react-router-dom";
import { HeartHandshake } from "lucide-react";
import { RISK_GUIDANCE } from "../../constants/riskGuidance.js";
import "./RiskGuidance.css";

// ผลของ "ประเมินตอนนี้" สำหรับตัวบุคคลเอง: กำลังใจและขั้นตอนถัดไป
// ไม่แสดงป้ายความเสี่ยงหรือตัวเลขเบื้องหลัง
export default function RiskGuidance({ level }) {
  const guidance = RISK_GUIDANCE[level] || RISK_GUIDANCE.low;
  return (
    <div className={`risk-guidance is-${level in RISK_GUIDANCE ? level : "low"}`} role="status">
      <p className="risk-guidance-title"><HeartHandshake size={18} aria-hidden="true" />{guidance.title}</p>
      <p className="risk-guidance-message">{guidance.message}</p>
      <ul className="risk-guidance-steps">
        {guidance.steps.map((step) => (
          <li key={step.text}>
            <span>{step.text}</span>
            {step.to?.startsWith("tel:") ? (
              <a href={step.to} className={`ui-btn ${step.primary ? "ui-btn-primary" : "ui-btn-outline"}`}>{step.label}</a>
            ) : step.to ? (
              <Link to={step.to} className={`ui-btn ${step.primary ? "ui-btn-primary" : "ui-btn-outline"}`}>{step.label}</Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
