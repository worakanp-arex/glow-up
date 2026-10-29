import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import EditorDialog from "../../components/common/EditorDialog.jsx";
import ShowMoreButton from "../../components/common/ShowMore.jsx";
import { useShowMore } from "../../components/common/useShowMore.js";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, CheckCircle2, Pencil, Play, Plus, Trash2 } from "lucide-react";
import * as microLessonService from "../../services/microLessonService.js";
import * as scenarioService from "../../services/scenarioService.js";
import useConfirmDialog from "../../components/common/useConfirmDialog.jsx";
import { formatCourseDate, toDateInputValue } from "../../utils/courseDates.js";
import "./LessonManagement.css";

const EMPTY_LESSON = { title: "", body: "", category: "", audience: "user", expiresAt: "" };
const AUDIENCE_LABELS = { user: "ผู้ใช้งาน (ผู้ผ่านการบำบัด)", family: "ครอบครัว/ผู้ดูแล" };
const EMPTY_OPTION = { text: "", isCorrect: false, feedback: "" };
const EMPTY_SCENARIO = { title: "", lesson: "", prompt: "", expiresAt: "", options: [{ ...EMPTY_OPTION }, { ...EMPTY_OPTION }] };

// รายการยังใช้ได้ตลอดวันสุดท้าย แล้วจึงหลุดจากสิ่งที่สมาชิกเห็น
function expiryInfo(expiresAt) {
  if (!expiresAt) return { state: "open", label: "ไม่มีวันหมดอายุ" };
  if (new Date(expiresAt) < new Date()) return { state: "expired", label: `หมดอายุแล้ว ${formatCourseDate(expiresAt)}` };
  return { state: "active", label: `หมดอายุ ${formatCourseDate(expiresAt)}` };
}

function ExpiryChip({ expiresAt }) {
  const { state, label } = expiryInfo(expiresAt);
  return <span className={`lesson-management-expiry is-${state}`}><CalendarDays size={12} aria-hidden="true" />{label}</span>;
}

function RowActions({ label, onEdit, onDelete }) {
  return (
    <div className="lesson-management-actions">
      <button type="button" onClick={onEdit} title="แก้ไข" aria-label={`แก้ไข${label}`}><Pencil size={16} /></button>
      <button type="button" className="is-danger" onClick={onDelete} title="ลบ" aria-label={`ลบ${label}`}><Trash2 size={16} /></button>
    </div>
  );
}

function LessonManagement() {
  const [lessons, setLessons] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // `editingLesson` / `editingScenario` เป็น null (ปิด), "new" หรือเรคคอร์ดที่กำลังแก้ไข
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonForm, setLessonForm] = useState(EMPTY_LESSON);
  const [editingScenario, setEditingScenario] = useState(null);
  const [scenarioForm, setScenarioForm] = useState(EMPTY_SCENARIO);

  const { confirm, confirmDialog } = useConfirmDialog();
  const lessonList = useShowMore(lessons);
  const scenarioList = useShowMore(scenarios);

  useEffect(() => {
    Promise.all([microLessonService.getAllLessons(), scenarioService.getAllScenarios()])
      .then(([lessonData, scenarioData]) => {
        setLessons(Array.isArray(lessonData) ? lessonData : []);
        setScenarios(Array.isArray(scenarioData) ? scenarioData : []);
      })
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  function openLesson(lesson) {
    setLessonForm(lesson ? {
      title: lesson.title,
      body: lesson.body || "",
      category: lesson.category || "",
      audience: lesson.audience || "user",
      expiresAt: toDateInputValue(lesson.expiresAt),
    } : EMPTY_LESSON);
    setEditingLesson(lesson || "new");
  }

  async function saveLesson() {
    const payload = {
      title: lessonForm.title.trim(),
      body: lessonForm.body.trim(),
      category: lessonForm.category.trim(),
      audience: lessonForm.audience,
      expiresAt: lessonForm.expiresAt || null,
    };
    if (editingLesson === "new") {
      const created = await microLessonService.createLesson(payload);
      setLessons((prev) => [created, ...prev]);
    } else {
      const updated = await microLessonService.updateLesson(editingLesson._id, payload);
      setLessons((prev) => prev.map((lesson) => (lesson._id === updated._id ? updated : lesson)));
    }
  }

  function handleDeleteLesson(lesson) {
    confirm({
      title: "ลบบทเรียน",
      message: `ต้องการลบบทเรียน "${lesson.title}" ใช่ไหม? การลบไม่สามารถย้อนกลับได้`,
      confirmLabel: "ลบบทเรียน",
      onConfirm: async () => {
        await microLessonService.deleteLesson(lesson._id);
        setLessons((prev) => prev.filter((item) => item._id !== lesson._id));
      },
    });
  }

  function openScenario(scenario) {
    setScenarioForm(scenario ? {
      title: scenario.title,
      lesson: scenario.lesson?._id || scenario.lesson || "",
      prompt: scenario.prompt || "",
      expiresAt: toDateInputValue(scenario.expiresAt),
      options: scenario.options.map((option) => ({ text: option.text, isCorrect: Boolean(option.isCorrect), feedback: option.feedback || "" })),
    } : EMPTY_SCENARIO);
    setEditingScenario(scenario || "new");
  }

  function updateOption(index, patch) {
    setScenarioForm((prev) => ({ ...prev, options: prev.options.map((option, i) => (i === index ? { ...option, ...patch } : option)) }));
  }

  async function saveScenario() {
    if (!scenarioForm.options.some((option) => option.isCorrect)) {
      throw new Error("กรุณาเลือกอย่างน้อย 1 ตัวเลือกที่ถูกต้อง");
    }
    const payload = {
      title: scenarioForm.title.trim(),
      // ค่าว่างจะล้างลิงก์ตอนแก้ไข เซิร์ฟเวอร์เมินค่านี้ตอนสร้าง
      lesson: scenarioForm.lesson || null,
      prompt: scenarioForm.prompt.trim(),
      expiresAt: scenarioForm.expiresAt || null,
      options: scenarioForm.options.map((option) => ({ ...option, text: option.text.trim() })),
    };
    if (editingScenario === "new") {
      const created = await scenarioService.createScenario(payload);
      setScenarios((prev) => [created, ...prev]);
    } else {
      const updated = await scenarioService.updateScenario(editingScenario._id, payload);
      setScenarios((prev) => prev.map((scenario) => (scenario._id === updated._id ? updated : scenario)));
    }
  }

  function handleDeleteScenario(scenario) {
    confirm({
      title: "ลบสถานการณ์จำลอง",
      message: `ต้องการลบสถานการณ์ "${scenario.title}" ใช่ไหม? การลบไม่สามารถย้อนกลับได้`,
      confirmLabel: "ลบสถานการณ์",
      onConfirm: async () => {
        await scenarioService.deleteScenario(scenario._id);
        setScenarios((prev) => prev.filter((item) => item._id !== scenario._id));
      },
    });
  }

  const header = (
    <PageHeader art="nurse" icon={BookOpen} description="เพิ่มบทเรียนสั้นและสถานการณ์จำลองเพื่อฝึกทักษะการปฏิเสธในสถานการณ์เสี่ยง แก้ไขหรือกำหนดวันหมดอายุได้">
      จัดการทักษะการปฏิเสธ
    </PageHeader>
  );

  if (loadError) return <div className="lesson-management-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  const lessonIncomplete = !lessonForm.title.trim() || !lessonForm.body.trim();
  const scenarioIncomplete = !scenarioForm.title.trim() || !scenarioForm.prompt.trim() || scenarioForm.options.length < 2 || scenarioForm.options.some((option) => !option.text.trim());

  return (
    <div className="lesson-management-page">
      {confirmDialog}
      {header}

      <section className="lesson-management-section" aria-labelledby="lesson-list-heading">
        <div className="lesson-management-section-head">
          <h2 id="lesson-list-heading">บทเรียนทั้งหมด <span className="lesson-management-count">({lessons.length})</span></h2>
          <button type="button" className="ui-btn ui-btn-primary" onClick={() => openLesson(null)}><Plus size={16} aria-hidden="true" />เพิ่มบทเรียน</button>
        </div>
        {loading ? (
          <AsyncState />
        ) : lessons.length === 0 ? (
          <p className="lesson-management-empty">ยังไม่มีบทเรียนในระบบ</p>
        ) : (
          <>
            <ul className="lesson-management-list">
              {lessonList.shown.map((lesson) => (
                <li key={lesson._id} className="ui-card">
                  <div className="lesson-management-list-body">
                    <p className="lesson-management-list-title">{lesson.title}</p>
                    <p className="lesson-management-meta">
                      {lesson.category && <span className="ui-chip">{lesson.category}</span>}
                      <span className="ui-chip ui-chip-neutral">{AUDIENCE_LABELS[lesson.audience] || AUDIENCE_LABELS.user}</span>
                      <ExpiryChip expiresAt={lesson.expiresAt} />
                    </p>
                  </div>
                  <RowActions label="บทเรียน" onEdit={() => openLesson(lesson)} onDelete={() => handleDeleteLesson(lesson)} />
                </li>
              ))}
            </ul>
            <ShowMoreButton hidden={lessonList.hidden} expanded={lessonList.expanded} onToggle={lessonList.toggle} />
          </>
        )}
      </section>

      <section className="lesson-management-section" aria-labelledby="scenario-list-heading">
        <div className="lesson-management-section-head">
          <h2 id="scenario-list-heading">สถานการณ์จำลองทั้งหมด <span className="lesson-management-count">({scenarios.length})</span></h2>
          <button type="button" className="ui-btn ui-btn-primary" onClick={() => openScenario(null)}><Plus size={16} aria-hidden="true" />เพิ่มสถานการณ์</button>
        </div>
        {loading ? (
          <AsyncState />
        ) : scenarios.length === 0 ? (
          <p className="lesson-management-empty">ยังไม่มีสถานการณ์จำลองในระบบ</p>
        ) : (
          <>
            <ul className="lesson-management-list">
              {scenarioList.shown.map((scenario) => (
                <li key={scenario._id} className="ui-card">
                  <div className="lesson-management-list-body">
                    <p className="lesson-management-list-title"><Play size={13} aria-hidden="true" />{scenario.title}</p>
                    <p className="lesson-management-meta">
                      <span className="ui-chip">{scenario.options.length} ตัวเลือก</span>
                      <ExpiryChip expiresAt={scenario.expiresAt} />
                    </p>
                  </div>
                  <RowActions label="สถานการณ์" onEdit={() => openScenario(scenario)} onDelete={() => handleDeleteScenario(scenario)} />
                </li>
              ))}
            </ul>
            <ShowMoreButton hidden={scenarioList.hidden} expanded={scenarioList.expanded} onToggle={scenarioList.toggle} />
          </>
        )}
      </section>

      {editingLesson && (
        <EditorDialog title={editingLesson === "new" ? "เพิ่มบทเรียนสั้น" : "แก้ไขบทเรียน"} onSave={saveLesson} onClose={() => setEditingLesson(null)} saveDisabled={lessonIncomplete}>
          <label className="ui-field">ชื่อบทเรียน<input type="text" value={lessonForm.title} onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))} required maxLength={200} /></label>
          <div className="editor-dialog-row">
            <label className="ui-field">หมวดหมู่<input type="text" value={lessonForm.category} onChange={(e) => setLessonForm((f) => ({ ...f, category: e.target.value }))} placeholder="เช่น เพื่อนชวน, งานเลี้ยง" /></label>
            <label className="ui-field">กลุ่มเป้าหมาย
              <select value={lessonForm.audience} onChange={(e) => setLessonForm((f) => ({ ...f, audience: e.target.value }))}>
                {Object.entries(AUDIENCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <label className="ui-field">วันหมดอายุ (ไม่กรอก = ไม่หมดอายุ)<input type="date" value={lessonForm.expiresAt} onChange={(e) => setLessonForm((f) => ({ ...f, expiresAt: e.target.value }))} /></label>
          <label className="ui-field">เนื้อหาบทเรียน<textarea value={lessonForm.body} onChange={(e) => setLessonForm((f) => ({ ...f, body: e.target.value }))} rows={5} required /></label>
        </EditorDialog>
      )}

      {editingScenario && (
        <EditorDialog title={editingScenario === "new" ? "เพิ่มสถานการณ์จำลอง" : "แก้ไขสถานการณ์จำลอง"} onSave={saveScenario} onClose={() => setEditingScenario(null)} saveDisabled={scenarioIncomplete}>
          <label className="ui-field">ชื่อสถานการณ์<input type="text" value={scenarioForm.title} onChange={(e) => setScenarioForm((f) => ({ ...f, title: e.target.value }))} required maxLength={200} /></label>
          <div className="editor-dialog-row">
            <label className="ui-field">บทเรียนที่เกี่ยวข้อง (ไม่บังคับ)
              <select value={scenarioForm.lesson} onChange={(e) => setScenarioForm((f) => ({ ...f, lesson: e.target.value }))}>
                <option value="">ไม่ระบุ</option>
                {lessons.map((lesson) => <option key={lesson._id} value={lesson._id}>{lesson.title}</option>)}
              </select>
            </label>
            <label className="ui-field">วันหมดอายุ (ไม่กรอก = ไม่หมดอายุ)<input type="date" value={scenarioForm.expiresAt} onChange={(e) => setScenarioForm((f) => ({ ...f, expiresAt: e.target.value }))} /></label>
          </div>
          <label className="ui-field">สถานการณ์ (คำถาม)
            <textarea value={scenarioForm.prompt} onChange={(e) => setScenarioForm((f) => ({ ...f, prompt: e.target.value }))} rows={3} required placeholder="เช่น เพื่อนชวนไปงานเลี้ยงที่มีการดื่มแอลกอฮอล์ คุณจะทำอย่างไร?" />
          </label>

          <div className="lesson-management-options">
            {scenarioForm.options.map((option, index) => (
              <div className="lesson-management-option" key={index}>
                <div className="lesson-management-option-fields">
                  <input type="text" placeholder={`ตัวเลือกที่ ${index + 1}`} aria-label={`ตัวเลือกที่ ${index + 1}`} value={option.text} onChange={(e) => updateOption(index, { text: e.target.value })} required />
                  <input type="text" placeholder="คำอธิบาย/feedback" aria-label={`คำอธิบายตัวเลือกที่ ${index + 1}`} value={option.feedback} onChange={(e) => updateOption(index, { feedback: e.target.value })} />
                  <label className="ui-choice">
                    <input type="checkbox" checked={option.isCorrect} onChange={(e) => updateOption(index, { isCorrect: e.target.checked })} />
                    <span className="ui-choice-mark" aria-hidden="true"><CheckCircle2 size={13} /></span>
                    <span className="ui-choice-text">ตัวเลือกนี้ถูกต้อง</span>
                  </label>
                </div>
                {scenarioForm.options.length > 2 && (
                  <button type="button" className="lesson-management-option-remove" onClick={() => setScenarioForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== index) }))} aria-label={`ลบตัวเลือกที่ ${index + 1}`}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="lesson-management-add-option" onClick={() => setScenarioForm((f) => ({ ...f, options: [...f.options, { ...EMPTY_OPTION }] }))}>
              <Plus size={14} aria-hidden="true" /><span>เพิ่มตัวเลือก</span>
            </button>
          </div>
        </EditorDialog>
      )}
    </div>
  );
}

export default LessonManagement;
