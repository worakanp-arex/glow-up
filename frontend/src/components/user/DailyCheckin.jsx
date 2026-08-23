import { useState } from "react";
import { CheckCircle2, Send, Sparkles } from "lucide-react";
import * as emotionService from "../../services/emotionService.js";
import { HAPPINESS_LEVELS } from "../../constants/happiness.js";
import "./DailyCheckin.css";

const INITIAL_FORM = { happinessLevel: null, cravingLevel: 5 };

function DailyCheckin({ loggedToday, onLogged }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.happinessLevel) return;
    setSubmitting(true);
    try {
      await emotionService.logEmotion({ ...form, cravingLevel: Number(form.cravingLevel) });
      setJustLogged(true);
      setForm(INITIAL_FORM);
      const stats = await emotionService.getMyStreak();
      onLogged?.(stats);
    } finally {
      setSubmitting(false);
    }
  }

  const showDone = loggedToday || justLogged;

  return (
    <div className={`daily-checkin${showDone ? " daily-checkin-done" : ""}`}>
      {showDone ? (
        <div className="daily-checkin-complete">
          <div className="daily-checkin-complete-icon">
            <CheckCircle2 size={26} />
          </div>
          <div>
            <h2>เช็คอินวันนี้เรียบร้อยแล้ว</h2>
            <p>เก่งมาก! แก้ไขบันทึกวันนี้ได้ที่หน้าบันทึกอารมณ์ หรือกลับมาใหม่พรุ่งนี้เพื่อรักษาสถิติของคุณไว้</p>
          </div>
        </div>
      ) : (
        <>
          <div className="daily-checkin-header">
            <span className="daily-checkin-eyebrow">
              <Sparkles size={14} />
              เช็คอินประจำวัน
            </span>
            <h2>วันนี้คุณรู้สึกอย่างไรบ้าง?</h2>
            <p>ใช้เวลาไม่ถึงนาที ช่วยให้เราดูแลคุณได้ดีขึ้น และรักษาสถิติต่อเนื่องของคุณไว้</p>
          </div>

          <form className="daily-checkin-form" onSubmit={handleSubmit}>
            <div className="daily-checkin-happiness-picker" role="radiogroup" aria-label="ระดับความสุขวันนี้">
              {HAPPINESS_LEVELS.map(({ level, label, icon: Icon, color }) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={form.happinessLevel === level}
                  title={label}
                  className={`daily-checkin-happiness-btn${form.happinessLevel === level ? " active" : ""}`}
                  style={{ "--happiness-color": color }}
                  onClick={() => setForm((prev) => ({ ...prev, happinessLevel: level }))}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>

            <div className="daily-checkin-form-row">
              <label className="daily-checkin-range">
                <span>ระดับความอยาก</span>
                <input
                  type="range"
                  name="cravingLevel"
                  min={1}
                  max={10}
                  value={form.cravingLevel}
                  onChange={handleChange}
                />
                <span className="daily-checkin-range-value">{form.cravingLevel}/10</span>
              </label>
              <button type="submit" disabled={submitting || !form.happinessLevel}>
                <Send size={16} />
                <span>{submitting ? "กำลังบันทึก..." : "บันทึกเช็คอิน"}</span>
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default DailyCheckin;
