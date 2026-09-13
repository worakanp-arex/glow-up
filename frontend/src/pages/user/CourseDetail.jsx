import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Award, BookOpen, ExternalLink, Heart } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as courseService from "../../services/courseService.js";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import "./CourseDetail.css";

function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [certUploading, setCertUploading] = useState(false);
  const [certError, setCertError] = useState("");
  const certInputRef = useRef(null);

  useEffect(() => {
    Promise.all([
      courseService.getCourse(id),
      user.role === "user" ? courseService.getMyCourses() : Promise.resolve([]),
    ])
      .then(([courseData, myCourses]) => {
        setCourse(courseData);
        setEnrollment(myCourses.find((e) => e.course._id === id) || null);
      })
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, [id, user.role]);

  async function handleToggleHeart() {
    if (enrollment) {
      await courseService.unenrollCourse(id);
      setEnrollment(null);
    } else {
      const created = await courseService.enrollCourse(id);
      setEnrollment(created);
    }
  }

  async function handleCertSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCertUploading(true);
    setCertError("");
    try {
      const updated = await courseService.uploadCourseCertificate(id, file);
      setEnrollment(updated);
    } catch (err) {
      setCertError(err.response?.data?.message || "อัปโหลดเกียรติบัตรไม่สำเร็จ");
    } finally {
      setCertUploading(false);
      e.target.value = "";
    }
  }

  const pageHeader = <PageHeader icon={BookOpen} backTo={"/courses"} backLabel="คอร์สเรียน">{course?.title || "รายละเอียดคอร์สเรียน"}</PageHeader>;

  if (loadError) return <div className="course-detail-page">{pageHeader}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) {
    return <div className="course-detail-page">{pageHeader}<AsyncState /></div>;
  }
  if (!course) {
    return <div className="course-detail-page">{pageHeader}ไม่พบคอร์สนี้</div>;
  }

  return (
    <div className="course-detail-page">
      {pageHeader}
      <div className="course-detail-card">
        {course.category && <span className="course-detail-category">{course.category}</span>}

        <p className="course-detail-description">{course.description}</p>

        {course.tags?.length > 0 && (
          <div className="course-detail-tags">
            {course.tags.map((tag) => (
              <span key={tag} className="course-detail-tag">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="course-detail-actions">
          <a href={course.externalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            <ExternalLink size={16} />
            <span>ไปที่คอร์สภายนอก</span>
          </a>
          {user.role === "user" && (
            <button
              type="button"
              className={`course-detail-heart-btn${enrollment ? " active" : ""}`}
              onClick={handleToggleHeart}
            >
              <Heart size={16} fill={enrollment ? "currentColor" : "none"} />
              <span>{enrollment ? "บันทึกไว้แล้ว" : "บันทึกคอร์สนี้"}</span>
            </button>
          )}
        </div>

        {user.role === "user" && enrollment && (
          <>
            <div className="course-detail-status-row">
              <span>สถานะของคุณ</span>
              <StatusBadge status={enrollment.certificateUrl ? "completed" : "learning"} />
            </div>

            <div className="course-detail-certificate">
              <h2>
                <Award size={16} />
                <span>เกียรติบัตร</span>
              </h2>
              {enrollment.certificateUrl ? (
                <a href={enrollment.certificateUrl} target="_blank" rel="noreferrer" className="course-detail-cert-link">
                  ดูเกียรติบัตรที่อัปโหลดไว้
                </a>
              ) : (
                <p className="course-detail-empty-note">ยังไม่ได้อัปโหลดเกียรติบัตร</p>
              )}
              {certError && <p className="course-detail-cert-error">{certError}</p>}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => certInputRef.current?.click()}
                disabled={certUploading}
              >
                {certUploading ? "กำลังอัปโหลด..." : enrollment.certificateUrl ? "เปลี่ยนไฟล์" : "อัปโหลดเกียรติบัตร"}
              </button>
              <input
                ref={certInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                hidden
                onChange={handleCertSelect}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CourseDetail;
