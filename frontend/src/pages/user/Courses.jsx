import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { usePagination } from "../../hooks/usePagination.js";
import AsyncState from "../../components/common/AsyncState.jsx";
import ImageSlot from "../../components/common/ImageSlot.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bookmark, BookOpen, ExternalLink, MessageCircleWarning, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as courseService from "../../services/courseService.js";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import "./Courses.css";

const ALL = "";
const SAVED = "__saved";
const COVER_TONES = ["primary", "lilac", "peach", "sky"];

function excerpt(text, max = 80) {
  const plain = (text || "").replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

function Courses() {
  const { user } = useAuth();
  const isUser = user.role === "user";
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);

  useEffect(() => {
    Promise.all([
      courseService.getCourses(),
      isUser ? courseService.getMyCourses() : Promise.resolve([]),
    ])
      .then(([allCourses, enrolled]) => {
        setCourses(allCourses);
        setMyCourses(enrolled);
      })
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, [isUser]);

  const categories = useMemo(
    () => [...new Set(courses.map((c) => c.category).filter(Boolean))],
    [courses]
  );

  const enrollmentById = useMemo(
    () => new Map(myCourses.filter((e) => e.course).map((e) => [e.course._id, e])),
    [myCourses]
  );

  const visibleCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((course) => {
      if (category === SAVED && !enrollmentById.has(course._id)) return false;
      if (category && category !== SAVED && course.category !== category) return false;
      if (!q) return true;
      const haystack = [course.title, course.description, course.category, ...(course.tags || [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [courses, query, category, enrollmentById]);

  const pagination = usePagination(visibleCourses);

  // "Continue where you left off": the most recent saved course without a certificate yet.
  const continuing = [...myCourses].reverse().find((e) => e.course && !e.certificateUrl)?.course;
  const featured = continuing || courses[0];

  async function handleToggleSaved(courseId, isEnrolled) {
    if (isEnrolled) {
      await courseService.unenrollCourse(courseId);
      setMyCourses((prev) => prev.filter((e) => e.course._id !== courseId));
    } else {
      const enrollment = await courseService.enrollCourse(courseId);
      setMyCourses((prev) => [...prev, enrollment]);
    }
  }

  const header = (
    <PageHeader icon={BookOpen} eyebrow="Learn · Try · Grow" description="เรียนทีละนิด ลองตอบสถานการณ์ แล้วเลือกนำไปใช้ในชีวิตจริง">
      เรื่องที่เรียนวันนี้ ใช้ได้ในวันพรุ่งนี้
    </PageHeader>
  );

  if (loadError) return <div className="courses-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) {
    return <div className="courses-page">{header}<AsyncState /></div>;
  }

  const tabs = [
    { key: ALL, label: "ทั้งหมด" },
    ...categories.map((c) => ({ key: c, label: c })),
    ...(isUser ? [{ key: SAVED, label: "ที่บันทึกไว้" }] : []),
  ];

  return (
    <div className="courses-page">
      {header}

      {featured && (
        <section className="courses-hero">
          <div className="courses-hero-copy">
            <p className="courses-hero-eyebrow">{continuing ? "เรียนต่อจากครั้งที่แล้ว" : "แนะนำสำหรับคุณ"}</p>
            <h2>{featured.title}</h2>
            <p>{excerpt(featured.description, 90) || "กลับมาเรียนต่อในจังหวะของคุณ"}</p>
            {continuing && <StatusBadge status="learning" />}
            <Link to={`/courses/${featured._id}`} className="ui-btn ui-btn-primary">{continuing ? "เรียนต่อ" : "เริ่มเรียน"}</Link>
          </div>
          <ImageSlot className="courses-hero-art" src="/images/illustrations/dashboard-hero.webp" alt="" />
        </section>
      )}

      <div className="courses-toolbar">
        <div className="courses-tabs" role="tablist" aria-label="หมวดคอร์สเรียน">
          {tabs.map((t) => (
            <button key={t.key || "all"} type="button" role="tab" aria-selected={category === t.key} className="ui-tab" onClick={() => setCategory(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="courses-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder="ค้นหาเรื่องที่อยากเรียน" aria-label="ค้นหาคอร์สเรียน" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {visibleCourses.length === 0 ? (
        <p className="courses-empty">
          {category === SAVED && !query.trim() ? "ยังไม่มีคอร์สที่บันทึกไว้ — แตะไอคอนบุ๊กมาร์กบนการ์ดเพื่อเก็บไว้เรียนต่อ" : "ไม่พบคอร์สเรียนที่ตรงกับเงื่อนไข"}
        </p>
      ) : (
        <ul className="courses-grid">
          {pagination.items.map((course) => {
            const enrollment = enrollmentById.get(course._id);
            const cover = (courses.indexOf(course) % 4) + 1;
            return (
              <li key={course._id} className="ui-card course-card">
                <div className="course-card-media">
                  <Link to={`/courses/${course._id}`} tabIndex={-1} aria-hidden="true">
                    <ImageSlot src={`/images/lessons/cover-${cover}.png`} alt="" tone={COVER_TONES[cover - 1]} />
                  </Link>
                  {isUser && (
                    <button
                      type="button"
                      className={`course-card-save${enrollment ? " is-saved" : ""}`}
                      onClick={() => handleToggleSaved(course._id, Boolean(enrollment))}
                      aria-pressed={Boolean(enrollment)}
                      aria-label={enrollment ? "เลิกบันทึกคอร์ส" : "บันทึกคอร์สนี้"}
                    >
                      <Bookmark size={15} fill={enrollment ? "currentColor" : "none"} />
                    </button>
                  )}
                </div>
                <div className="course-card-body">
                  <span className="course-card-category">{course.category || "คอร์สเรียน"}{course.tags?.length > 0 && ` · ${course.tags.slice(0, 2).map((t) => `#${t}`).join(" ")}`}</span>
                  <h2><Link to={`/courses/${course._id}`}>{course.title}</Link></h2>
                  <p>{excerpt(course.description) || "เรียนรู้ไปทีละขั้น ในจังหวะของคุณ"}</p>
                  {isUser && enrollment && <StatusBadge status={enrollment.certificateUrl ? "completed" : "learning"} />}
                  <div className="course-card-actions">
                    <Link to={`/courses/${course._id}`} className={`ui-btn ${enrollment ? "ui-btn-primary" : "ui-btn-outline"}`}>
                      {enrollment ? (enrollment.certificateUrl ? "ดูอีกครั้ง" : "เรียนต่อ") : "เริ่มเรียน"}
                    </Link>
                    <a href={course.externalUrl} target="_blank" rel="noopener noreferrer" className="course-card-external-link" aria-label={`เปิดคอร์ส ${course.title} ในแท็บใหม่`}>
                      <ExternalLink size={15} />
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination {...pagination} />

      <Link to="/learning" className="ui-card courses-learning-callout">
        <span className="courses-learning-callout-icon"><MessageCircleWarning size={20} /></span>
        <span className="courses-learning-callout-text">
          <strong>ฝึกทักษะการปฏิเสธ</strong>
          <span>บทเรียนสั้นและสถานการณ์จำลอง ฝึกวิธีปฏิเสธในสถานการณ์เสี่ยง</span>
        </span>
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}

export default Courses;
