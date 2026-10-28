import { Link } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import "./SavedJobHint.css";

// Shown right after a job is bookmarked: courses are suggested from the jobs a
// person saves, so point them to where those suggestions appear.
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
