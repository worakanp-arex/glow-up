import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import "./StatTile.css";

// ส่ง `to` (route) หรือ `onClick` เพื่อให้ทั้งไทล์เป็นลิงก์เจาะลึก
function StatTile({ label, value, tone = "neutral", to, onClick, hint }) {
  const body = (
    <>
      <p className="stat-tile-label">{label}</p>
      <p className="stat-tile-value">{value}</p>
      {hint && <p className="stat-tile-hint">{hint}</p>}
      {(to || onClick) && <ChevronRight className="stat-tile-chevron" size={16} aria-hidden="true" />}
    </>
  );
  const className = `stat-tile stat-tile-${tone}${to || onClick ? " stat-tile-interactive" : ""}`;
  if (to) return <Link to={to} className={className}>{body}</Link>;
  if (onClick) return <button type="button" className={className} onClick={onClick}>{body}</button>;
  return <div className={className}>{body}</div>;
}

export default StatTile;
