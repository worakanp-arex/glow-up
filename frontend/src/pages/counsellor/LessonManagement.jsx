import { useEffect, useState } from "react";
import { BookOpen, Play, Plus, Trash2 } from "lucide-react";
import * as microLessonService from "../../services/microLessonService.js";
import * as scenarioService from "../../services/scenarioService.js";
import "./LessonManagement.css";

const INITIAL_LESSON_FORM = { title: "", body: "", category: "" };
const EMPTY_OPTION = { text: "", isCorrect: false, feedback: "" };
const INITIAL_SCENARIO_FORM = { title: "", lesson: "", prompt: "", options: [{ ...EMPTY_OPTION }, { ...EMPTY_OPTION }] };

function LessonManagement() {
  const [lessons, setLessons] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [lessonForm, setLessonForm] = useState(INITIAL_LESSON_FORM);
  const [savingLesson, setSavingLesson] = useState(false);
  const [lessonError, setLessonError] = useState("");

  const [scenarioForm, setScenarioForm] = useState(INITIAL_SCENARIO_FORM);
  const [savingScenario, setSavingScenario] = useState(false);
  const [scenarioError, setScenarioError] = useState("");

  useEffect(() => {
    Promise.all([microLessonService.getAllLessons(), scenarioService.getAllScenarios()])
      .then(([lessonData, scenarioData]) => {
        setLessons(lessonData);
        setScenarios(scenarioData);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleLessonSubmit(e) {
    e.preventDefault();
    setLessonError("");
    setSavingLesson(true);
    try {
      const created = await microLessonService.createLesson(lessonForm);
      setLessons((prev) => [created, ...prev]);
      setLessonForm(INITIAL_LESSON_FORM);
    } catch (err) {
      setLessonError(err.response?.data?.message || "เพิ่มบทเรียนไม่สำเร็จ");
    } finally {
      setSavingLesson(false);
    }
  }

  async function handleDeleteLesson(id) {
    if (!window.confirm("ลบบทเรียนนี้?")) return;
    await microLessonService.deleteLesson(id);
    setLessons((prev) => prev.filter((l) => l._id !== id));
  }

  function updateOption(index, patch) {
    setScenarioForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)),
    }));
  }

  function addOption() {
    setScenarioForm((prev) => ({ ...prev, options: [...prev.options, { ...EMPTY_OPTION }] }));
  }

  function removeOption(index) {
    setScenarioForm((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  }

  async function handleScenarioSubmit(e) {
    e.preventDefault();
    setScenarioError("");
    if (!scenarioForm.options.some((opt) => opt.isCorrect)) {
      setScenarioError("กรุณาเลือกอย่างน้อย 1 ตัวเลือกที่ถูกต้อง");
      return;
    }
    setSavingScenario(true);
    try {
      const created = await scenarioService.createScenario({
        ...scenarioForm,
        lesson: scenarioForm.lesson || undefined,
      });
      setScenarios((prev) => [created, ...prev]);
      setScenarioForm(INITIAL_SCENARIO_FORM);
    } catch (err) {
      setScenarioError(err.response?.data?.message || "เพิ่มสถานการณ์ไม่สำเร็จ");
    } finally {
      setSavingScenario(false);
    }
  }

  async function handleDeleteScenario(id) {
    if (!window.confirm("ลบสถานการณ์นี้?")) return;
    await scenarioService.deleteScenario(id);
    setScenarios((prev) => prev.filter((s) => s._id !== id));
  }

  return (
    <div className="lesson-management-page">
      <h1>
        <BookOpen size={22} />
        <span>จัดการทักษะการปฏิเสธ</span>
      </h1>
      <p className="lesson-management-intro">
        เพิ่มบทเรียนสั้นและสถานการณ์จำลองเพื่อฝึกทักษะการปฏิเสธในสถานการณ์เสี่ยง
      </p>

      <form className="lesson-management-form" onSubmit={handleLessonSubmit}>
        <h2>
          <Plus size={16} />
          <span>เพิ่มบทเรียนสั้น</span>
        </h2>
        <div className="lesson-management-form-grid">
          <label>
            ชื่อบทเรียน
            <input
              type="text"
              value={lessonForm.title}
              onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </label>
          <label>
            หมวดหมู่
            <input
              type="text"
              value={lessonForm.category}
              onChange={(e) => setLessonForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="เช่น เพื่อนชวน, งานเลี้ยง"
            />
          </label>
        </div>
        <label className="lesson-management-body-field">
          เนื้อหาบทเรียน
          <textarea
            value={lessonForm.body}
            onChange={(e) => setLessonForm((f) => ({ ...f, body: e.target.value }))}
            rows={4}
            required
          />
        </label>
        {lessonError && <p className="lesson-management-error">{lessonError}</p>}
        <button type="submit" className="btn btn-primary" disabled={savingLesson}>
          {savingLesson ? "กำลังเพิ่ม..." : "เพิ่มบทเรียน"}
        </button>
      </form>

      <h2 className="lesson-management-list-heading">บทเรียนทั้งหมด</h2>
      {loading ? (
        <p>กำลังโหลด...</p>
      ) : lessons.length === 0 ? (
        <p className="lesson-management-empty">ยังไม่มีบทเรียนในระบบ</p>
      ) : (
        <ul className="lesson-management-list">
          {lessons.map((lesson) => (
            <li key={lesson._id}>
              <div className="lesson-management-list-body">
                <p className="lesson-management-list-title">{lesson.title}</p>
                {lesson.category && <span className="lesson-management-list-category">{lesson.category}</span>}
              </div>
              <button type="button" onClick={() => handleDeleteLesson(lesson._id)} aria-label="ลบบทเรียน">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="lesson-management-form" onSubmit={handleScenarioSubmit}>
        <h2>
          <Plus size={16} />
          <span>เพิ่มสถานการณ์จำลอง</span>
        </h2>
        <div className="lesson-management-form-grid">
          <label>
            ชื่อสถานการณ์
            <input
              type="text"
              value={scenarioForm.title}
              onChange={(e) => setScenarioForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </label>
          <label>
            บทเรียนที่เกี่ยวข้อง (ไม่บังคับ)
            <select
              value={scenarioForm.lesson}
              onChange={(e) => setScenarioForm((f) => ({ ...f, lesson: e.target.value }))}
            >
              <option value="">ไม่ระบุ</option>
              {lessons.map((lesson) => (
                <option key={lesson._id} value={lesson._id}>
                  {lesson.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="lesson-management-body-field">
          สถานการณ์ (คำถาม)
          <textarea
            value={scenarioForm.prompt}
            onChange={(e) => setScenarioForm((f) => ({ ...f, prompt: e.target.value }))}
            rows={3}
            required
            placeholder="เช่น เพื่อนชวนไปงานเลี้ยงที่มีการดื่มแอลกอฮอล์ คุณจะทำอย่างไร?"
          />
        </label>

        <div className="lesson-management-options">
          {scenarioForm.options.map((option, index) => (
            <div className="lesson-management-option-row" key={index}>
              <input
                type="text"
                placeholder={`ตัวเลือกที่ ${index + 1}`}
                value={option.text}
                onChange={(e) => updateOption(index, { text: e.target.value })}
                required
              />
              <label className="lesson-management-option-correct">
                <input
                  type="checkbox"
                  checked={option.isCorrect}
                  onChange={(e) => updateOption(index, { isCorrect: e.target.checked })}
                />
                <span>ถูกต้อง</span>
              </label>
              <input
                type="text"
                placeholder="คำอธิบาย/feedback"
                value={option.feedback}
                onChange={(e) => updateOption(index, { feedback: e.target.value })}
              />
              {scenarioForm.options.length > 2 && (
                <button type="button" onClick={() => removeOption(index)} aria-label="ลบตัวเลือก">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button type="button" className="lesson-management-add-option" onClick={addOption}>
            <Plus size={14} />
            <span>เพิ่มตัวเลือก</span>
          </button>
        </div>

        {scenarioError && <p className="lesson-management-error">{scenarioError}</p>}
        <button type="submit" className="btn btn-primary" disabled={savingScenario}>
          {savingScenario ? "กำลังเพิ่ม..." : "เพิ่มสถานการณ์"}
        </button>
      </form>

      <h2 className="lesson-management-list-heading">สถานการณ์จำลองทั้งหมด</h2>
      {loading ? (
        <p>กำลังโหลด...</p>
      ) : scenarios.length === 0 ? (
        <p className="lesson-management-empty">ยังไม่มีสถานการณ์จำลองในระบบ</p>
      ) : (
        <ul className="lesson-management-list">
          {scenarios.map((scenario) => (
            <li key={scenario._id}>
              <div className="lesson-management-list-body">
                <p className="lesson-management-list-title">
                  <Play size={13} />
                  {scenario.title}
                </p>
                <span className="lesson-management-list-category">{scenario.options.length} ตัวเลือก</span>
              </div>
              <button type="button" onClick={() => handleDeleteScenario(scenario._id)} aria-label="ลบสถานการณ์">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LessonManagement;
