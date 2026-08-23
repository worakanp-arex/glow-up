import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as courseService from "../../services/courseService.js";
import "./CourseDetail.css";

function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      courseService.getCourse(id),
      user.role === "user" ? courseService.getMyCourses() : Promise.resolve([]),
    ])
      .then(([courseData, myCourses]) => {
        setCourse(courseData);
        setEnrollment(myCourses.find((e) => e.course._id === id) || null);
      })
      .finally(() => setLoading(false));
  }, [id, user.role]);

  async function handleEnroll() {
    const created = await courseService.enrollCourse(id);
    setEnrollment(created);
  }

  async function handleProgressChange(e) {
    const progress = Number(e.target.value);
    setSaving(true);
    try {
      const updated = await courseService.updateProgress(id, progress);
      setEnrollment(updated);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="course-detail-page">กำลังโหลด...</div>;
  }
  if (!course) {
    return <div className="course-detail-page">ไม่พบคอร์สนี้</div>;
  }

  return (
    <div className="course-detail-page">
      <Link to="/courses" className="course-detail-back">
        <ArrowLeft size={16} />
        คอร์สเรียนทั้งหมด
      </Link>

      <div className="course-detail-card">
        <div className="course-detail-icon">
          <BookOpen size={22} />
        </div>
        {course.category && <span className="course-detail-category">{course.category}</span>}
        <h1>{course.title}</h1>
        <p className="course-detail-description">{course.description}</p>

        {user.role === "user" &&
          (enrollment ? (
            <div className="course-detail-progress">
              <div className="course-detail-progress-header">
                <span>ความคืบหน้าของคุณ</span>
                <strong>{enrollment.progress}%</strong>
              </div>
              <div className="course-detail-progress-track">
                <div className="course-detail-progress-fill" style={{ width: `${enrollment.progress}%` }} />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={enrollment.progress}
                onChange={handleProgressChange}
                disabled={saving}
              />
            </div>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleEnroll}>
              ลงทะเบียนเรียน
            </button>
          ))}
      </div>
    </div>
  );
}

export default CourseDetail;
