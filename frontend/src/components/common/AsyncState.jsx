import { AlertCircle, LoaderCircle, Search } from "lucide-react";
export default function AsyncState({ error, empty, title, description, onRetry, children }) {
  const Icon = error ? AlertCircle : empty ? Search : LoaderCircle;
  return <div className={`async-state ${error ? "is-error" : ""}`} role={error ? "alert" : "status"} aria-live="polite">
    <span className="async-state-icon"><Icon size={26} className={!error && !empty ? "spin" : ""} /></span>
    <h2>{title || (error ? "โหลดข้อมูลไม่สำเร็จ" : empty ? "ยังไม่มีรายการในตอนนี้" : "กำลังเตรียมข้อมูลให้คุณ")}</h2>
    <p>{description || (error ? "ตรวจสอบการเชื่อมต่อ แล้วลองอีกครั้ง" : empty ? "เมื่อมีข้อมูล รายการจะแสดงที่นี่" : "รอสักครู่ คุณจะได้ไปต่อแล้ว")}</p>
    {onRetry && <button className="btn btn-secondary" onClick={onRetry}>ลองอีกครั้ง</button>}{children}
  </div>;
}
