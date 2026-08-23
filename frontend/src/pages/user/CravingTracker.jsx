import { useEffect, useState } from "react";
import { Activity, Briefcase, Globe, MoreHorizontal, Send, Users } from "lucide-react";
import * as emotionService from "../../services/emotionService.js";
import * as riskService from "../../services/riskService.js";
import { HAPPINESS_LEVELS, happinessByLevel } from "../../constants/happiness.js";
import EmotionCalendar from "../../components/user/EmotionCalendar.jsx";
import "./CravingTracker.css";

const CONTEXT_OPTIONS = [
  { value: "work", label: "การทำงาน", icon: Briefcase },
  { value: "family", label: "ครอบครัว", icon: Users },
  { value: "environment", label: "สิ่งแวดล้อม", icon: Globe },
  { value: "other", label: "อื่นๆ", icon: MoreHorizontal },
];

const RISK_LABELS = { low: "ต่ำ", medium: "ปานกลาง", high: "สูง" };
const RISK_CLASS = { low: "craving-tracker-risk-low", medium: "craving-tracker-risk-medium", high: "craving-tracker-risk-high" };

const INITIAL_FORM = { happinessLevel: null, cravingLevel: 5, context: "work", note: "" };

function CravingTracker() {
  const [logs, setLogs] = useState([]);
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [risk, setRisk] = useState(null);
  const [assessing, setAssessing] = useState(false);

  useEffect(() => {
    Promise.all([emotionService.getMyEmotionLogs(), emotionService.getMyStreak()])
      .then(([logsData, streakData]) => {
        setLogs(logsData);
        setStreak(streakData);
        if (streakData.loggedToday && logsData.length > 0) {
          const today = logsData[0];
          setForm({
            happinessLevel: today.happinessLevel || null,
            cravingLevel: today.cravingLevel ?? 5,
            context: today.context || "work",
            note: today.note || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.happinessLevel) return;
    setSubmitting(true);
    try {
      const log = await emotionService.logEmotion({
        ...form,
        cravingLevel: Number(form.cravingLevel),
      });
      setLogs((prev) => [log, ...prev.filter((item) => item._id !== log._id)]);
      const stats = await emotionService.getMyStreak();
      setStreak(stats);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssessRisk() {
    setAssessing(true);
    try {
      const result = await riskService.getMyRisk();
      setRisk(result);
    } finally {
      setAssessing(false);
    }
  }

  return (
    <div className="craving-tracker-page">
      <h1>
        <Activity size={22} />
        <span>บันทึกอารมณ์และความอยาก</span>
      </h1>
      <p className="craving-tracker-intro">
        บันทึกความรู้สึกของคุณวันละครั้ง เพื่อติดตามแนวโน้มและรับการประเมินความเสี่ยงที่แม่นยำขึ้น
        ข้อมูลนี้จะถูกใช้เพื่อช่วยทีมดูแลเข้าใจภาพรวมของคุณได้ดีขึ้น
      </p>

      <div className="craving-tracker-layout">
        <section>
          {loading ? (
            <div className="emotion-calendar-card">
              <p>กำลังโหลด...</p>
            </div>
          ) : (
            <EmotionCalendar history={streak?.history || []} />
          )}

          <h2 className="craving-tracker-list-heading">ประวัติการบันทึก</h2>
          {loading ? (
            <p>กำลังโหลด...</p>
          ) : logs.length === 0 ? (
            <p className="craving-tracker-empty">ยังไม่มีบันทึก</p>
          ) : (
            <ul className="craving-tracker-list">
              {logs.map((log) => {
                const context = CONTEXT_OPTIONS.find((c) => c.value === log.context);
                const happiness = log.happinessLevel ? happinessByLevel(log.happinessLevel) : null;
                const HappinessIcon = happiness?.icon;
                return (
                  <li key={log._id}>
                    <div
                      className="craving-tracker-list-icon"
                      style={happiness ? { backgroundColor: happiness.color, color: "#fff" } : undefined}
                    >
                      {HappinessIcon ? <HappinessIcon size={18} /> : <Activity size={18} />}
                    </div>
                    <div className="craving-tracker-list-body">
                      <p className="craving-tracker-mood">{happiness?.label || "ยังไม่ระบุระดับความสุข"}</p>
                      <p className="craving-tracker-meta">
                        {new Date(log.date).toLocaleDateString("th-TH")}
                        {context && ` · ${context.label}`}
                      </p>
                      {log.note && <p className="craving-tracker-note">{log.note}</p>}
                    </div>
                    {log.cravingLevel != null && (
                      <span className="craving-tracker-badge">อยาก {log.cravingLevel}/10</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="craving-tracker-sidebar">
          <form className="craving-tracker-form" onSubmit={handleSubmit}>
            <h2 className="craving-tracker-form-title">
              {streak?.loggedToday ? "แก้ไขบันทึกวันนี้" : "บันทึกวันนี้"}
            </h2>

            <div className="craving-tracker-happiness-field">
              <span className="craving-tracker-field-label">วันนี้คุณรู้สึกอย่างไร</span>
              <div className="craving-tracker-happiness-picker" role="radiogroup" aria-label="ระดับความสุขวันนี้">
                {HAPPINESS_LEVELS.map(({ level, label, icon: Icon, color }) => (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={form.happinessLevel === level}
                    title={label}
                    className={`craving-tracker-happiness-btn${form.happinessLevel === level ? " active" : ""}`}
                    style={{ "--happiness-color": color }}
                    onClick={() => setForm((prev) => ({ ...prev, happinessLevel: level }))}
                  >
                    <Icon size={20} />
                  </button>
                ))}
              </div>
              <span className="craving-tracker-happiness-selected-label">
                {form.happinessLevel ? happinessByLevel(form.happinessLevel).label : "แตะเพื่อเลือกระดับ"}
              </span>
            </div>

            <label>
              ระดับความอยาก (1-10)
              <div className="craving-tracker-range">
                <input
                  type="range"
                  name="cravingLevel"
                  min={1}
                  max={10}
                  value={form.cravingLevel}
                  onChange={handleChange}
                />
                <span className="craving-tracker-level-value">{form.cravingLevel}</span>
              </div>
            </label>
            <label>
              สถานการณ์ (ถ้ามี)
              <select name="context" value={form.context} onChange={handleChange}>
                {CONTEXT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              บันทึกเพิ่มเติม (ถ้ามี)
              <textarea
                name="note"
                value={form.note}
                onChange={handleChange}
                rows={2}
                placeholder="เช่น สิ่งที่เกิดขึ้นวันนี้..."
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={submitting || !form.happinessLevel}>
              <Send size={16} />
              <span>
                {submitting ? "กำลังบันทึก..." : streak?.loggedToday ? "อัปเดตบันทึกวันนี้" : "บันทึก"}
              </span>
            </button>
          </form>

          <section className="craving-tracker-risk">
            <div className="craving-tracker-risk-header">
              <h2>ผลประเมินความเสี่ยง</h2>
            </div>
            {risk && (
              <p className={`craving-tracker-risk-result ${RISK_CLASS[risk.level] || ""}`}>
                ระดับความเสี่ยง: <strong>{RISK_LABELS[risk.level]}</strong>
                {risk.triggerFactors && (
                  <span className="craving-tracker-risk-note"> — {risk.triggerFactors}</span>
                )}
              </p>
            )}
            <button
              type="button"
              className="btn btn-secondary craving-tracker-assess-button"
              onClick={handleAssessRisk}
              disabled={assessing}
            >
              {assessing ? "กำลังประเมิน..." : "ประเมินความเสี่ยงตอนนี้"}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default CravingTracker;
