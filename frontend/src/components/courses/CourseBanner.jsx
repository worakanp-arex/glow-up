import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Pause, Play, Sparkles } from "lucide-react";
import StatusBadge from "../common/StatusBadge.jsx";
import { courseCover } from "../../utils/courseCover.js";
import { courseRange } from "../../utils/courseDates.js";
import "./CourseBanner.css";

const AUTOPLAY_MS = 6500;
const SWIPE_PX = 45;

function excerpt(text, max = 110) {
  const plain = (text || "").replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// สไลด์เดียว: ภาพปกเต็มสัดส่วนชิดขวา (ไม่ตัดตัวหนังสือในภาพปก) สีเข้มไล่จากซ้ายมาหาข้อความ
// และใช้ภาพเดียวกันเบลอเป็นพื้นหลัง ถ้าภาพโหลดไม่ได้จะเหลือพื้นสีเข้มกับข้อความ
function BannerSlide({ slide, active, position, total }) {
  const [missing, setMissing] = useState(false);
  const { course, eyebrow, reason, continuing, coverIndex } = slide;
  const cover = courseCover(course, coverIndex);
  const range = courseRange(course);
  return (
    <div
      className={`course-banner-slide${active ? " is-active" : ""}`}
      role="group"
      aria-roledescription="slide"
      aria-label={`${position} จาก ${total}`}
      inert={!active}
    >
      {!missing && <img className="course-banner-backdrop" src={cover.src} alt="" aria-hidden="true" onError={() => setMissing(true)} />}
      {!missing && (
        <div className="course-banner-art">
          <img src={cover.src} alt="" />
        </div>
      )}
      <div className="course-banner-copy">
        <p className="course-banner-eyebrow">{eyebrow}</p>
        <h2>{course.title}</h2>
        <p className="course-banner-desc">{excerpt(course.description) || "กลับมาเรียนต่อในจังหวะของคุณ"}</p>
        {reason && <p className="course-banner-reason"><Sparkles size={14} aria-hidden="true" />{reason}</p>}
        {(continuing || range) && (
          <div className="course-banner-meta">
            {continuing && <StatusBadge status="learning" />}
            {range && <span><CalendarDays size={13} aria-hidden="true" />{range}</span>}
          </div>
        )}
        <Link to={`/courses/${course._id}`} className="ui-btn ui-btn-primary">{continuing ? "เรียนต่อ" : "เริ่มเรียน"}</Link>
      </div>
    </div>
  );
}

// แบนเนอร์คอร์สแนะนำเลื่อนวนหลายคอร์ส: เลื่อนเองทุก ~6.5 วินาที หยุดเมื่อเมาส์อยู่บนแบนเนอร์หรือโฟกัสด้วยคีย์บอร์ดอยู่ข้างใน
// (การคลิกปุ่มด้วยเมาส์ไม่นับเป็นโฟกัสคีย์บอร์ด ไม่งั้นกดครั้งเดียวแล้วจะหยุดเลื่อนตลอด)
// มีปุ่มก่อนหน้า/ถัดไป จุดเลือกสไลด์ ปุ่มหยุด/เล่น (ผู้ที่ตั้งค่าลดการเคลื่อนไหวของระบบจะไม่เลื่อนเอง)
// รองรับลูกศรซ้าย-ขวาบนคีย์บอร์ดและปัดนิ้วบนมือถือ
export default function CourseBanner({ slides }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touchStart, setTouchStart] = useState(null);

  const active = Math.min(index, Math.max(count - 1, 0));
  const autoplay = count > 1 && playing && !hovered && !focused;

  // ตั้งเวลาใหม่ทุกครั้งที่สไลด์เปลี่ยน (รวมกรณีกดเอง) ผู้ใช้จึงได้อ่านครบเวลาเสมอ
  useEffect(() => {
    if (!autoplay) return undefined;
    const timer = setTimeout(() => setIndex((current) => (current + 1) % count), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [autoplay, active, count]);

  if (count === 0) return null;

  const go = (next) => setIndex(((next % count) + count) % count);

  function handleKeyDown(event) {
    if (count < 2 || event.target.closest("input, textarea")) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); go(active - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); go(active + 1); }
  }

  function handleTouchEnd(event) {
    if (touchStart === null) return;
    const delta = event.changedTouches[0].clientX - touchStart;
    setTouchStart(null);
    if (Math.abs(delta) >= SWIPE_PX) go(active + (delta < 0 ? 1 : -1));
  }

  return (
    <section
      className="course-banner"
      aria-roledescription="carousel"
      aria-label="คอร์สแนะนำสำหรับคุณ"
      onKeyDown={handleKeyDown}
      onPointerEnter={(event) => setHovered(event.pointerType === "mouse")}
      onPointerLeave={() => setHovered(false)}
      onFocus={(event) => setFocused(event.target.matches(":focus-visible"))}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
      onTouchEnd={handleTouchEnd}
    >
      {/* อ่านออกเสียงการเปลี่ยนสไลด์เฉพาะตอนที่ไม่ได้เลื่อนเอง เพื่อไม่รบกวนผู้ใช้โปรแกรมอ่านหน้าจอ */}
      <div className="course-banner-track" aria-live={autoplay ? "off" : "polite"}>
        {slides.map((slide, i) => (
          <BannerSlide key={slide.course._id} slide={slide} active={i === active} position={i + 1} total={count} />
        ))}
      </div>

      {count > 1 && (
        <div className="course-banner-controls">
          <button type="button" className="course-banner-arrow" onClick={() => go(active - 1)} aria-label="คอร์สก่อนหน้า"><ChevronLeft size={18} aria-hidden="true" /></button>
          <div className="course-banner-dots">
            {slides.map((slide, i) => (
              <button
                key={slide.course._id}
                type="button"
                className={`course-banner-dot${i === active ? " is-active" : ""}`}
                onClick={() => go(i)}
                aria-label={`ไปยังคอร์สที่ ${i + 1}: ${slide.course.title}`}
                aria-current={i === active ? "true" : undefined}
              />
            ))}
          </div>
          <button type="button" className="course-banner-arrow" onClick={() => go(active + 1)} aria-label="คอร์สถัดไป"><ChevronRight size={18} aria-hidden="true" /></button>
          <button
            type="button"
            className="course-banner-arrow course-banner-toggle"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "หยุดเลื่อนอัตโนมัติ" : "เลื่อนอัตโนมัติ"}
          >
            {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          </button>
        </div>
      )}
    </section>
  );
}
