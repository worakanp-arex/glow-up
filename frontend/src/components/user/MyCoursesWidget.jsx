import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import * as courseService from "../../services/courseService.js";
import StatusBadge from "../common/StatusBadge.jsx";
import "./MyCoursesWidget.css";

function MyCoursesWidget() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    courseService
      .getMyCourses()
      .then(setEnrollments)
      .catch(() => setEnrollments([]))
      .finally(() => setLoading(false));
  }, []);

  const completedCount = enrollments.filter((e) => e.certificateUrl).length;
  const stillLearning = enrollments.filter((e) => !e.certificateUrl);
  const current = stillLearning[0] || enrollments[0];

  return (
    <Link to="/courses" className="my-courses-widget">
      <div className="my-courses-widget-icon">
        <BookOpen size={20} />
      </div>
      <div className="my-courses-widget-body">
        <h2>คอร์สเรียนของฉัน</h2>
        {loading ? (
          <p className="my-courses-widget-loading">กำลังโหลด...</p>
        ) : !current ? (
          <p className="my-courses-widget-empty">ยังไม่ได้ลงทะเบียนคอร์สเรียน — เริ่มพัฒนาทักษะใหม่กันเลย</p>
        ) : (
          <>
            <p className="my-courses-widget-title">{current.course?.title}</p>
            <StatusBadge status={current.certificateUrl ? "completed" : "learning"} />
            <span className="my-courses-widget-summary">
              ลงทะเบียนแล้ว {enrollments.length} คอร์ส
              {completedCount > 0 ? ` · เรียนจบแล้ว ${completedCount} คอร์ส` : ""}
            </span>
          </>
        )}
      </div>
    </Link>
  );
}

export default MyCoursesWidget;
