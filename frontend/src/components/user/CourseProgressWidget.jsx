import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import * as courseService from "../../services/courseService.js";
import "./CourseProgressWidget.css";

function CourseProgressWidget() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    courseService
      .getMyCourses()
      .then(setEnrollments)
      .catch(() => setEnrollments([]))
      .finally(() => setLoading(false));
  }, []);

  const inProgress = enrollments.filter((e) => e.progress < 100);
  const current = inProgress[0] || enrollments[0];

  return (
    <Link to="/courses" className="course-progress-widget">
      <div className="course-progress-icon">
        <BookOpen size={20} />
      </div>
      <div className="course-progress-body">
        <h2>คอร์สเรียนของฉัน</h2>
        {loading ? (
          <p className="course-progress-loading">กำลังโหลด...</p>
        ) : !current ? (
          <p className="course-progress-empty">ยังไม่ได้ลงทะเบียนคอร์สเรียน — เริ่มพัฒนาทักษะใหม่กันเลย</p>
        ) : (
          <>
            <p className="course-progress-title">{current.course?.title}</p>
            <div className="course-progress-track">
              <div className="course-progress-fill" style={{ width: `${current.progress}%` }} />
            </div>
            <span className="course-progress-label">
              {current.progress}% เสร็จแล้ว
              {enrollments.length > 1 ? ` · ลงทะเบียนแล้ว ${enrollments.length} คอร์ส` : ""}
            </span>
          </>
        )}
      </div>
    </Link>
  );
}

export default CourseProgressWidget;
