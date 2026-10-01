import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import ImageSlot from "../../components/common/ImageSlot.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookOpen, Play, Search } from "lucide-react";
import * as microLessonService from "../../services/microLessonService.js";
import * as scenarioService from "../../services/scenarioService.js";
import "./MicroLessons.css";

const LESSON_COVERS = 4;
const ALL = "all";
const SAVED = "saved";
const SCENARIOS = "scenarios";

function excerpt(text, max = 70) {
  const plain = (text || "").replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

function MicroLessons() {
  const [lessons, setLessons] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [tab, setTab] = useState(ALL);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    Promise.all([microLessonService.getLessons(), scenarioService.getScenarios()])
      .then(([lessonData, scenarioData]) => {
        setLessons(lessonData);
        setScenarios(scenarioData);
      })
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
    // Bookmarks are a convenience — the page still works if they fail to load.
    microLessonService.getSavedLessonIds().then((ids) => setSavedIds(new Set(ids))).catch(() => {});
  }, []);

  const categories = useMemo(
    () => [...new Set(lessons.map((lesson) => lesson.category).filter(Boolean))],
    [lessons]
  );

  const needle = query.trim().toLowerCase();
  const matches = (...fields) => !needle || fields.some((f) => f?.toLowerCase().includes(needle));

  const visibleLessons = tab === SCENARIOS ? [] : lessons.filter((lesson) =>
    (tab === ALL || (tab === SAVED ? savedIds.has(lesson._id) : lesson.category === tab)) &&
    matches(lesson.title, lesson.category, lesson.body)
  );
  const visibleScenarios = tab === ALL || tab === SCENARIOS ? scenarios.filter((s) => matches(s.title)) : [];

  const featured = lessons.find((lesson) => savedIds.has(lesson._id)) || lessons[0];

  async function toggleSaved(id) {
    const wasSaved = savedIds.has(id);
    const next = new Set(savedIds);
    if (wasSaved) next.delete(id); else next.add(id);
    setSavedIds(next);
    try {
      if (wasSaved) await microLessonService.unsaveLesson(id);
      else await microLessonService.saveLesson(id);
    } catch {
      setSavedIds((prev) => {
        const revert = new Set(prev);
        if (wasSaved) revert.add(id); else revert.delete(id);
        return revert;
      });
    }
  }

  const header = (
    <PageHeader icon={BookOpen} eyebrow="Learn · Try · Grow" description="เรียนทีละนิด ลองตอบสถานการณ์ แล้วเลือกนำไปใช้ในชีวิตจริง">
      เรื่องที่เรียนวันนี้ ใช้ได้ในวันพรุ่งนี้
    </PageHeader>
  );

  if (loadError) return <div className="micro-lessons-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) {
    return <div className="micro-lessons-page">{header}<AsyncState /></div>;
  }

  const tabs = [
    { key: ALL, label: "ทั้งหมด" },
    ...categories.map((c) => ({ key: c, label: c })),
    ...(scenarios.length > 0 ? [{ key: SCENARIOS, label: "สถานการณ์จำลอง" }] : []),
    { key: SAVED, label: "ที่บันทึกไว้" },
  ];
  const nothing = visibleLessons.length === 0 && visibleScenarios.length === 0;

  return (
    <div className="micro-lessons-page">
      {header}

      {featured && (
        <section className="lessons-hero">
          <div className="lessons-hero-copy">
            <p className="lessons-hero-eyebrow">{savedIds.has(featured._id) ? "จากบทเรียนที่คุณบันทึกไว้" : "แนะนำสำหรับคุณ"}</p>
            <h2>{featured.title}</h2>
            <p>{excerpt(featured.body, 90) || "กลับมาเรียนต่อในจังหวะของคุณ"}</p>
            <Link to={`/learning/${featured._id}`} className="ui-btn ui-btn-primary">เรียนเลย</Link>
          </div>
          <ImageSlot className="lessons-hero-art" src="/images/illustrations/dashboard-hero.webp" alt="" />
        </section>
      )}

      <div className="lessons-toolbar">
        <div className="lessons-tabs" role="tablist" aria-label="หมวดบทเรียน">
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className="ui-tab" onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="lessons-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาเรื่องที่อยากเรียน" aria-label="ค้นหาบทเรียน" />
        </label>
      </div>

      {nothing ? (
        <p className="micro-lessons-empty">
          {tab === SAVED && !needle ? "ยังไม่มีบทเรียนที่บันทึกไว้ — แตะไอคอนบุ๊กมาร์กบนการ์ดเพื่อเก็บไว้อ่านภายหลัง" : needle ? `ไม่พบบทเรียนที่ตรงกับ “${query.trim()}”` : "ยังไม่มีบทเรียนในขณะนี้"}
        </p>
      ) : (
        <ul className="lessons-grid">
          {visibleLessons.map((lesson) => {
            const saved = savedIds.has(lesson._id);
            const cover = (lessons.indexOf(lesson) % LESSON_COVERS) + 1;
            return (
              <li key={lesson._id} className="ui-card lesson-card">
                <div className="lesson-card-media">
                  <ImageSlot src={`/images/lessons/cover-${cover}.png`} alt="" tone={["primary", "lilac", "peach", "sky"][cover - 1]} />
                  <button
                    type="button"
                    className={`lesson-card-save${saved ? " is-saved" : ""}`}
                    onClick={() => toggleSaved(lesson._id)}
                    aria-pressed={saved}
                    aria-label={saved ? `เลิกบันทึก ${lesson.title}` : `บันทึก ${lesson.title}`}
                  >
                    <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
                  </button>
                </div>
                <div className="lesson-card-body">
                  {lesson.category && <span className="lesson-card-cat">{lesson.category}</span>}
                  <h3>{lesson.title}</h3>
                  <p>{excerpt(lesson.body)}</p>
                  <Link to={`/learning/${lesson._id}`} className="ui-btn ui-btn-outline ui-btn-block">เริ่มเรียน</Link>
                </div>
              </li>
            );
          })}
          {visibleScenarios.map((scenario) => (
            <li key={scenario._id} className="ui-card lesson-card">
              <div className="lesson-card-media">
                <ImageSlot src="/images/lessons/scenario.png" alt="" tone="lilac" />
              </div>
              <div className="lesson-card-body">
                <span className="lesson-card-cat">สถานการณ์จำลอง</span>
                <h3>{scenario.title}</h3>
                <p>ลองเลือกคำตอบ แล้วดูว่าแต่ละทางพาไปสู่อะไร</p>
                <Link to={`/learning/scenarios/${scenario._id}`} className="ui-btn ui-btn-outline ui-btn-block"><Play size={14} aria-hidden="true" />เริ่มฝึก</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MicroLessons;
