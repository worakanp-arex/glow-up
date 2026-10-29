import { Link } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import "./SavedJobHint.css";

// แสดงทันทีหลังบุ๊กมาร์กงาน: คอร์สถูกแนะนำจากงานที่
// ผู้ใช้บันทึก จึงชี้ไปยังที่ที่คำแนะนำเหล่านั้นปรากฏ
export default function SavedJobHint({ show }) {
  if (!show) return null;
  return (
    <p className="saved-job-hint" role="status">
      <Lightbulb size={16} aria-hidden="true" />
      <span>บันทึกงานแล้ว เราจะแนะนำคอร์สเรียนที่เกี่ยวข้องกับงานนี้ให้คุณ</span>
      <Link to="/courses#recommended">ดูคอร์สแนะนำ</Link>
    </p>
  );
}
