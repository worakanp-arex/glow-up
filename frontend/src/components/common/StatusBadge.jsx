import "./StatusBadge.css";

const LABELS = {
  pending: "รอดำเนินการ",
  verified: "ยืนยันแล้ว",
  rejected: "ปฏิเสธ",
  open: "เปิดรับ",
  closed: "ปิดรับ",
  expired: "หมดอายุ",
  interview: "นัดสัมภาษณ์",
  passed: "ผ่านการคัดเลือก",
  cancelled: "ยกเลิกแล้ว",
  completed: "เรียนจบแล้ว",
  learning: "กำลังเรียน",
};

function StatusBadge({ status }) {
  return <span className={`status-badge status-badge-${status}`}>{LABELS[status] || status}</span>;
}

export default StatusBadge;
