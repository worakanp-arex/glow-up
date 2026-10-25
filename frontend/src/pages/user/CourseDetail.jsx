import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import ImageSlot from "../../components/common/ImageSlot.jsx";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Award, BookOpen, CalendarDays, ExternalLink, Heart } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as courseService from "../../services/courseService.js";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import { courseStatus, formatCourseDate } from "../../utils/courseDates.js";
import { courseCover } from "../../utils/courseCover.js";
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
  const [actionError, setActionError] = useState("");
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
    setActionError("");
    try {
      if (enrollment) {
        await courseService.unenrollCourse(id);
        setEnrollment(null);
      } else {
        const created = await courseService.enrollCourse(id);
        setEnrollment(created);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || "บันทึกคอร์สไม่สำเร็จ");
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

  const status = courseStatus(course);
  const expired = status.state === "expired";
  const notOpenYet = status.state === "upcoming";
  const hasDates = Boolean(course.startDate || course.endDate);
  const cover = courseCover(course);

  return (
    <div className="course-detail-page">
      {pageHeader}
      <div className="course-detail-layout">
        <aside className="ui-card course-detail-preview" aria-label="ตัวอย่างและการเข้าเรียน">
          <ImageSlot className="course-detail-cover" src={cover.src} tone={cover.tone} alt="" />

          {hasDates && (
            <div className="course-detail-dates">
              <span className={`course-detail-status is-${status.state}`}>{status.label}</span>
              <dl>
                {course.startDate && <div><dt><CalendarDays size={14} aria-hidden="true" />วันที่เริ่ม</dt><dd>{formatCourseDate(course.startDate)}</dd></div>}
                {course.endDate && <div><dt><CalendarDays size={14} aria-hidden="true" />วันที่สิ้นสุด</dt><dd>{formatCourseDate(course.endDate)}</dd></div>}
              </dl>
            </div>
          )}

          <div className="course-detail-actions">
            {expired || notOpenYet ? (
              <button type="button" className="ui-btn ui-btn-primary" disabled>
                <ExternalLink size={16} />
                <span>{expired ? "คอร์สนี้หมดอายุแล้ว" : "ยังไม่เปิดให้เรียน"}</span>
              </button>
            ) : (
              <a href={course.externalUrl} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-primary">
                <ExternalLink size={16} />
                <span>ไปที่คอร์สภายนอก</span>
              </a>
            )}
            {user.role === "user" && (
              <button
                type="button"
                className={`course-detail-heart-btn${enrollment ? " active" : ""}`}
                onClick={handleToggleHeart}
                disabled={expired && !enrollment}
              >
                <Heart size={16} fill={enrollment ? "currentColor" : "none"} />
                <span>{enrollment ? "บันทึกไว้แล้ว" : "บันทึกคอร์สนี้"}</span>
              </button>
            )}
          </div>
          {actionError && <p className="course-detail-cert-error" role="alert">{actionError}</p>}
        </aside>

        <div className="course-detail-main">
          <section className="ui-card course-detail-info">
            {course.category && <span className="course-detail-category">{course.category}</span>}
            <p className="course-detail-description">{course.description || "เรียนรู้ไปทีละขั้น ในจังหวะของคุณ"}</p>
            {course.tags?.length > 0 && (
              <div className="course-detail-tags">
                {course.tags.map((tag) => (
                  <span key={tag} className="course-detail-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {status.state === "expiring" && <p className="course-detail-warning" role="status">คอร์สนี้ใกล้หมดอายุ — {status.label} รีบเข้าเรียนให้ทัน</p>}
          </section>

          {user.role === "user" && enrollment && (
            <section className="ui-card course-detail-progress">
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
                  className="ui-btn ui-btn-outline"
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
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default CourseDetail;
