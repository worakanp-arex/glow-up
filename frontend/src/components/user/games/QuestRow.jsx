import { CheckCircle2, ChevronDown, ChevronUp, Lock } from "lucide-react";
import "./QuestRow.css";

// status: "locked" | "current" | "done"
function QuestRow({ icon: Icon, title, subtitle, doneSummary, status, expanded, onToggle, children }) {
  const clickable = status !== "locked";

  return (
    <li className={`quest-row quest-row-${status}`}>
      <button type="button" className="quest-row-header" onClick={clickable ? onToggle : undefined} disabled={!clickable}>
        <span className="quest-row-icon">
          <Icon size={18} />
        </span>
        <span className="quest-row-info">
          <span className="quest-row-title">{title}</span>
          <span className="quest-row-subtitle">{status === "done" ? doneSummary : subtitle}</span>
        </span>
        <span className="quest-row-status-icon">
          {status === "locked" ? (
            <Lock size={16} />
          ) : status === "done" ? (
            <CheckCircle2 size={18} className="quest-row-done-icon" />
          ) : expanded ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
        </span>
      </button>
      {expanded && clickable && <div className="quest-row-body">{children}</div>}
    </li>
  );
}

export default QuestRow;
