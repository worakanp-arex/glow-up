import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useMemo, useState } from "react";
import { Activity, ChevronDown, Send } from "lucide-react";
import * as emotionService from "../../services/emotionService.js";
import * as riskService from "../../services/riskService.js";
import { HAPPINESS_LEVELS, happinessByLevel } from "../../constants/happiness.js";
import { CONTEXT_OPTIONS } from "../../constants/emotionContext.js";
import EmotionCalendar from "../../components/user/EmotionCalendar.jsx";
import BackfillEmotionModal from "../../components/user/BackfillEmotionModal.jsx";
import WeeklyCheckInWidget from "../../components/user/WeeklyCheckInWidget.jsx";
import { groupByMonth, monthGroupLabel } from "../../utils/calendarGrid.js";
import "./CravingTracker.css";

const MONTH_INITIAL_LIMIT = 5;
const MONTH_LOAD_MORE_STEP = 10;
const MISSING_DAYS_WINDOW = 7;

const RISK_LABELS = { low: "ต่ำ", medium: "ปานกลาง", high: "สูง" };
const RISK_CLASS = { low: "craving-tracker-risk-low", medium: "craving-tracker-risk-medium", high: "craving-tracker-risk-high" };

const INITIAL_FORM = { happinessLevel: null, cravingLevel: 5, context: "work", note: "" };

function pad(n) {
  return String(n).padStart(2, "0");
}

function toLocalDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatThaiShortDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
}

function CravingTracker() {
  const [logs, setLogs] = useState([]);
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [risk, setRisk] = useState(null);
  const [assessing, setAssessing] = useState(false);
  const [monthVisibleCounts, setMonthVisibleCounts] = useState({});
  const [backfillDateKey, setBackfillDateKey] = useState(null);
  const [missingDays, setMissingDays] = useState([]);
  const [missingDaysPromptOpen, setMissingDaysPromptOpen] = useState(false);

  const historyGroups = useMemo(() => groupByMonth(logs, "date"), [logs]);

  function refresh() {
    return Promise.all([emotionService.getMyEmotionLogs(), emotionService.getMyStreak()]).then(
      ([logsData, streakData]) => {
        setLogs(logsData);
        setStreak(streakData);
        return logsData;
      }
    );
  }

  useEffect(() => {
    refresh()
      .then((logsData) => {
        if (logsData.length > 0 && logsData[0].dateKey === toLocalDateKey(new Date())) {
          const today = logsData[0];
          setForm({
            happinessLevel: today.happinessLevel || null,
            cravingLevel: today.cravingLevel ?? 5,
            context: today.context || "work",
            note: today.note || "",
          });
        }
      })
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await emotionService.logEmotion({ ...form, cravingLevel: Number(form.cravingLevel) });
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function findMissingDays() {
    const loggedKeys = new Set(logs.map((l) => l.dateKey));
    const missing = [];
    const today = new Date();
    for (let i = 0; i < MISSING_DAYS_WINDOW; i += 1) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = toLocalDateKey(d);
      if (!loggedKeys.has(key)) missing.push(key);
    }
    return missing;
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

  function handleAssessRiskClick() {
    const missing = findMissingDays();
    if (missing.length > 0) {
      setMissingDays(missing);
      setMissingDaysPromptOpen(true);
    } else {
      handleAssessRisk();
    }
  }

  function handleSkipAndAssess() {
    setMissingDaysPromptOpen(false);
    handleAssessRisk();
  }

  function handleMissingDayChipClick(dateKey) {
    setMissingDaysPromptOpen(false);
    setBackfillDateKey(dateKey);
  }

  async function handleBackfillSaved() {
    await refresh();
    setBackfillDateKey(null);
  }

  function getMonthVisibleCount(key) {
    return monthVisibleCounts[key] ?? MONTH_INITIAL_LIMIT;
  }

  function showMoreForMonth(key, total) {
    setMonthVisibleCounts((prev) => ({
      ...prev,
      [key]: Math.min((prev[key] ?? MONTH_INITIAL_LIMIT) + MONTH_LOAD_MORE_STEP, total),
    }));
  }

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  return (
    <div className="craving-tracker-page">
      <PageHeader icon={Activity} description={<>
        บันทึกความรู้สึกของคุณวันละครั้ง เพื่อติดตามแนวโน้มและรับการประเมินความเสี่ยงที่แม่นยำขึ้น
        ข้อมูลนี้จะถูกใช้เพื่อช่วยทีมดูแลเข้าใจภาพรวมของคุณได้ดีขึ้น
      </>}>บันทึกอารมณ์และความอยาก</PageHeader>

      <div className="craving-tracker-layout">
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

          <WeeklyCheckInWidget />
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
              onClick={handleAssessRiskClick}
              disabled={assessing}
            >
              {assessing ? "กำลังประเมิน..." : "ประเมินความเสี่ยงตอนนี้"}
            </button>
          </section>
        </aside>

        <section>
          {loading ? (
            <div className="emotion-calendar-card">
              <AsyncState />
            </div>
          ) : (
            <EmotionCalendar logs={logs} onSelectEmptyDay={setBackfillDateKey} />
          )}
          <p className="craving-tracker-backfill-hint">
            แตะวันที่ว่างในปฏิทิน (เส้นประ) เพื่อบันทึกความรู้สึกย้อนหลังในวันที่คุณไม่ได้เข้ามา
          </p>

          <h2 className="craving-tracker-list-heading">ประวัติการบันทึก</h2>
          {loading ? (
            <AsyncState />
          ) : logs.length === 0 ? (
            <p className="craving-tracker-empty">ยังไม่มีบันทึก</p>
          ) : (
            historyGroups.map((group) => {
              const visibleCount = getMonthVisibleCount(group.key);
              const visibleItems = group.items.slice(0, visibleCount);
              return (
                <div key={group.key} className="craving-tracker-month-group">
                  <h3 className="craving-tracker-month-heading">{monthGroupLabel(group.year, group.month)}</h3>
                  <ul className="craving-tracker-list">
                    {visibleItems.map((log) => {
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
                  {visibleCount < group.items.length && (
                    <button
                      type="button"
                      className="btn btn-secondary craving-tracker-load-more"
                      onClick={() => showMoreForMonth(group.key, group.items.length)}
                    >
                      <ChevronDown size={15} />
                      <span>ดูเพิ่มเติม ({group.items.length - visibleCount} รายการที่เหลือในเดือนนี้)</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </section>


      </div>

      {missingDaysPromptOpen && (
        <div className="backfill-modal-overlay" onClick={() => setMissingDaysPromptOpen(false)}>
          <div className="backfill-modal missing-days-prompt" onClick={(e) => e.stopPropagation()}>
            <div className="backfill-modal-header">
              <h2>พบว่ายังไม่ได้บันทึกบางวัน</h2>
            </div>
            <p>
              ในช่วง {MISSING_DAYS_WINDOW} วันที่ผ่านมา คุณยังไม่ได้บันทึกอารมณ์ {missingDays.length} วัน
              การกรอกข้อมูลให้ครบจะช่วยให้ผลประเมินความเสี่ยงแม่นยำขึ้น ต้องการกรอกเพิ่มก่อนไหม?
            </p>
            <div className="missing-days-chip-list">
              {missingDays.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="missing-days-chip"
                  onClick={() => handleMissingDayChipClick(key)}
                >
                  {formatThaiShortDate(key)}
                </button>
              ))}
            </div>
            <div className="backfill-modal-actions">
              <button type="button" className="btn btn-primary" onClick={handleSkipAndAssess}>
                ประเมินเลย ไม่ต้องกรอกเพิ่ม
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setMissingDaysPromptOpen(false)}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {backfillDateKey && (
        <BackfillEmotionModal
          dateKey={backfillDateKey}
          existingLog={logs.find((l) => l.dateKey === backfillDateKey) || null}
          onClose={() => setBackfillDateKey(null)}
          onSaved={handleBackfillSaved}
        />
      )}
    </div>
  );
}

export default CravingTracker;
