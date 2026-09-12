import Pagination from "../../components/common/Pagination.jsx";
import { usePagination } from "../../hooks/usePagination.js";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, ExternalLink, Heart, MessageCircleWarning, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as courseService from "../../services/courseService.js";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import "./Courses.css";

function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    Promise.all([
      courseService.getCourses(),
      user.role === "user" ? courseService.getMyCourses() : Promise.resolve([]),
    ])
      .then(([allCourses, enrolled]) => {
        setCourses(allCourses);
        setMyCourses(enrolled);
      })
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, [user.role]);

  const categories = useMemo(
    () => [...new Set(courses.map((c) => c.category).filter(Boolean))],
    [courses]
  );

  const visibleCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((course) => {
      if (category && course.category !== category) return false;
      if (!q) return true;
      const haystack = [course.title, course.description, ...(course.tags || [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [courses, query, category]);

  const pagination = usePagination(visibleCourses);

  async function handleToggleHeart(courseId, isEnrolled) {
    if (isEnrolled) {
      await courseService.unenrollCourse(courseId);
      setMyCourses((prev) => prev.filter((e) => e.course._id !== courseId));
    } else {
      const enrollment = await courseService.enrollCourse(courseId);
      setMyCourses((prev) => [...prev, enrollment]);
    }
  }

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="courses-page"><AsyncState /></div>;
  }

  return (
    <div className="courses-page">
      <h1>
       
        <span>คอร์สเรียน</span>
      </h1>
      <p className="courses-subtitle">คอร์สเรียนจากบุคลากรทางการแพทย์ พัฒนาทักษะใหม่ๆ เพื่อเปิดโอกาสในการทำงานให้กว้างขึ้น</p>

      <Link to="/learning" className="courses-learning-callout">
        <span className="courses-learning-callout-icon">
          <MessageCircleWarning size={20} />
        </span>
        <span className="courses-learning-callout-text">
          <span className="courses-learning-callout-title">ฝึกทักษะการปฏิเสธ</span>
          <span className="courses-learning-callout-desc">บทเรียนสั้นและสถานการณ์จำลอง ฝึกวิธีปฏิเสธในสถานการณ์เสี่ยง</span>
        </span>
        <ArrowRight size={18} />
      </Link>

      <div className="courses-filters">
        <div className="courses-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="ค้นหาคอร์สเรียน หรือแท็ก..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {categories.length > 0 && (
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {visibleCourses.length === 0 ? (
        <p className="courses-empty">ไม่พบคอร์สเรียนที่ตรงกับเงื่อนไข</p>
      ) : (
        <div className="courses-grid">
          {pagination.items.map((course) => {
            const enrollment = myCourses.find((e) => e.course._id === course._id);
            return (
              <div key={course._id} className="course-card">
                <Link to={`/courses/${course._id}`} className="course-card-link">
                  <div className="course-card-icon">
                    <BookOpen size={20} />
                  </div>
                  {course.category && <span className="course-card-category">{course.category}</span>}
                  <h2>{course.title}</h2>
                  {course.tags?.length > 0 && (
                    <div className="course-card-tags">
                      {course.tags.map((tag) => (
                        <span key={tag} className="course-card-tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>

                <div className="course-card-actions">
                  <a
                    href={course.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="course-card-external-link"
                  >
                    <ExternalLink size={13} />
                    <span>เปิดคอร์ส</span>
                  </a>

                  {user.role === "user" && (
                    <button
                      type="button"
                      className={`course-card-heart-btn${enrollment ? " active" : ""}`}
                      onClick={() => handleToggleHeart(course._id, Boolean(enrollment))}
                      aria-label={enrollment ? "เลิกบันทึกคอร์ส" : "บันทึกคอร์สนี้"}
                    >
                      <Heart size={16} fill={enrollment ? "currentColor" : "none"} />
                    </button>
                  )}
                </div>

                {user.role === "user" && enrollment && (
                  <StatusBadge status={enrollment.certificateUrl ? "completed" : "learning"} />
                )}
              </div>
            );
          })}
        </div>
      )}
      <Pagination {...pagination} />
    </div>
  );
}

export default Courses;
