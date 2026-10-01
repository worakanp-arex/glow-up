import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Check, ChevronDown, Clock, Heart, Lock, Plus, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import * as emotionService from "../../services/emotionService.js";
import * as riskService from "../../services/riskService.js";
import * as riskSituationService from "../../services/riskSituationService.js";
import { happinessByLevel } from "../../constants/happiness.js";
import { CONTEXT_OPTIONS } from "../../constants/emotionContext.js";
import MoodFacePicker from "../../components/user/MoodFacePicker.jsx";
import { CravingRange } from "../../components/user/DailyCheckin.jsx";
import EmotionCalendar from "../../components/user/EmotionCalendar.jsx";
import BackfillEmotionModal from "../../components/user/BackfillEmotionModal.jsx";
import WeeklyCheckInWidget from "../../components/user/WeeklyCheckInWidget.jsx";
import { groupByMonth, monthGroupLabel } from "../../utils/calendarGrid.js";
import "./CravingTracker.css";

// The history box scrolls, so show a fuller month before "load more".
const MONTH_INITIAL_LIMIT = 15;
const MONTH_LOAD_MORE_STEP = 10;
const MISSING_DAYS_WINDOW = 7;

const RISK_LABELS = { low: "ต่ำ", medium: "ปานกลาง", high: "สูง" };
const RISK_CLASS = { low: "craving-tracker-risk-low", medium: "craving-tracker-risk-medium", high: "craving-tracker-risk-high" };

const OUTCOME_LABELS = {
  handled_well: "รับมือได้ดี ไม่กระทบ",
  partially_handled: "รับมือได้บางส่วน",
  relapsed: "กลับไปใช้ซ้ำ",
};
const INITIAL_RISK_SITUATION_FORM = { situation: "", skillUsed: true, skillDescription: "", outcome: "handled_well" };

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
  const [riskSituationLogs, setRiskSituationLogs] = useState([]);
  const [riskSituationForm, setRiskSituationForm] = useState(INITIAL_RISK_SITUATION_FORM);
  const [submittingRiskSituation, setSubmittingRiskSituation] = useState(false);
  const [riskSituationError, setRiskSituationError] = useState("");

  const historyGroups = useMemo(() => groupByMonth(logs, "date"), [logs]);

  const summary = useMemo(() => {
    const since = Date.now() - 30 * 86400000;
    const recent = logs.filter((log) => new Date(log.date).getTime() >= since);
    const cravings = recent.map((log) => log.cravingLevel).filter((v) => v != null);
    const moodCounts = new Map();
    for (const log of recent) {
      if (log.happinessLevel) moodCounts.set(log.happinessLevel, (moodCounts.get(log.happinessLevel) || 0) + 1);
    }
    const [topLevel] = [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    return {
      days: recent.length,
      avgCraving: cravings.length ? (cravings.reduce((a, b) => a + b, 0) / cravings.length).toFixed(1) : null,
      topMood: topLevel ? happinessByLevel(topLevel)?.label : null,
    };
  }, [logs]);

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

  useEffect(() => {
    riskSituationService.getMyRiskSituationLogs().then(setRiskSituationLogs).catch(() => setRiskSituationLogs([]));
  }, []);

  async function handleRiskSituationSubmit(e) {
    e.preventDefault();
    setRiskSituationError("");
    setSubmittingRiskSituation(true);
    try {
      const created = await riskSituationService.createRiskSituationLog(riskSituationForm);
      setRiskSituationLogs((prev) => [created, ...prev]);
      setRiskSituationForm(INITIAL_RISK_SITUATION_FORM);
    } catch (err) {
      setRiskSituationError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSubmittingRiskSituation(false);
    }
  }

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
      <PageHeader icon={Activity} eyebrow="Check in with yourself" description="บันทึกวันละครั้ง เพื่อดูแนวโน้มของตัวเองและช่วยให้ทีมดูแลเข้าใจภาพรวมของคุณได้ดีขึ้น">
        บันทึกอารมณ์และความอยาก
      </PageHeader>

      <form className="ui-card craving-tracker-form" onSubmit={handleSubmit}>
        <div>
          <div className="checkin-top">
            <span className="ui-chip"><Heart size={12} aria-hidden="true" />{streak?.loggedToday ? "แก้ไขบันทึกวันนี้" : "เช็คอินความรู้สึก"}</span>
            <span className="checkin-private"><Lock size={12} aria-hidden="true" />พื้นที่ส่วนตัว</span>
          </div>
          <h2 className="checkin-title">วันนี้ ความรู้สึกของคุณเป็นอย่างไร?</h2>
          <p className="checkin-sub">ไม่มีคำตอบที่ถูกหรือผิด เลือกความรู้สึกที่ใกล้กับคุณที่สุด</p>
        </div>

        <MoodFacePicker value={form.happinessLevel} onChange={(level) => setForm((prev) => ({ ...prev, happinessLevel: level }))} />

        <div className="craving-tracker-form-row">
          <CravingRange value={form.cravingLevel} onChange={handleChange} />
          <label className="ui-field">
            เกี่ยวข้องกับเรื่องไหน?
            <select name="context" value={form.context} onChange={handleChange}>
              {CONTEXT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="checkin-note">
          <span>อยากเล่าอะไรเพิ่มเติมไหม <small>(ไม่บังคับ)</small></span>
          <textarea name="note" value={form.note} onChange={handleChange} rows={2} placeholder="วันนี้มีอะไรเกิดขึ้นกับคุณบ้าง..." />
        </label>

        <div className="checkin-foot">
          <span className="ui-muted"><Clock size={14} aria-hidden="true" />ใช้เวลาเพียง 1 นาที</span>
          <button type="submit" className="ui-btn ui-btn-primary" disabled={submitting || !form.happinessLevel}>
            <Check size={16} aria-hidden="true" />
            <span>{submitting ? "กำลังบันทึก..." : streak?.loggedToday ? "อัปเดตบันทึกวันนี้" : "บันทึกความรู้สึก"}</span>
          </button>
        </div>
      </form>

      <div className="craving-tracker-layout">
        <section className="craving-tracker-calendar">
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
        </section>

        <section className="ui-card craving-tracker-history">
          <div className="ui-card-head">
            <h2 className="craving-tracker-list-heading">ประวัติการบันทึก</h2>
            {logs.length > 0 && <span className="ui-chip">{logs.length} วัน</span>}
          </div>
          <div className="craving-tracker-history-scroll" tabIndex={0} aria-label="รายการประวัติการบันทึก เลื่อนดูได้">
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
                            style={happiness ? { "--happiness-color": happiness.color } : undefined}
                          >
                            {HappinessIcon ? <HappinessIcon size={18} /> : <Activity size={18} />}
                          </div>
                          <div className="craving-tracker-list-body">
                            <p className="craving-tracker-mood">{happiness?.label || "ยังไม่ระบุระดับความสุข"}</p>
                            <p className="craving-tracker-meta">
                              {new Date(log.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                              {context && ` · ${context.label}`}
                            </p>
                            {log.note && <p className="craving-tracker-note">{log.note}</p>}
                          </div>
                          {log.cravingLevel != null && (
                            <span className="craving-tracker-badge"><b>{log.cravingLevel}/10</b>ความอยาก</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {visibleCount < group.items.length && (
                    <button
                      type="button"
                      className="ui-btn ui-btn-outline ui-btn-block craving-tracker-load-more"
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
          </div>
          <p className="craving-tracker-private-note"><Lock size={13} aria-hidden="true" />ครอบครัวและนายจ้างไม่เห็นบันทึกนี้</p>
        </section>
      </div>

      <div className="craving-tracker-lower">
        <div className="craving-tracker-lower-col">
          <WeeklyCheckInWidget />
          <section className="ui-card craving-tracker-risk">
            <div className="ui-card-head">
              <div>
                <h2>ผลประเมินความเสี่ยง</h2>
                <p>ประเมินจากบันทึกของคุณในช่วงที่ผ่านมา</p>
              </div>
              <ShieldCheck size={18} aria-hidden="true" />
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
              className="ui-btn ui-btn-outline ui-btn-block craving-tracker-assess-button"
              onClick={handleAssessRiskClick}
              disabled={assessing}
            >
              {assessing ? "กำลังประเมิน..." : "ประเมินความเสี่ยงตอนนี้"}
            </button>
          </section>

          <section className="ui-card craving-tracker-summary" aria-label="สรุป 30 วันที่ผ่านมา">
            <div className="ui-card-head">
              <div>
                <h2>สรุป 30 วันที่ผ่านมา</h2>
                <p>ดูแนวโน้มของตัวเองแบบคร่าว ๆ</p>
              </div>
              <TrendingUp size={18} aria-hidden="true" />
            </div>
            <dl className="craving-tracker-summary-stats">
              <div><dt>วันที่บันทึก</dt><dd>{summary.days}<small> วัน</small></dd></div>
              <div><dt>ความอยากเฉลี่ย</dt><dd>{summary.avgCraving ?? "–"}<small> / 10</small></dd></div>
              <div><dt>ความรู้สึกที่พบบ่อย</dt><dd className="craving-tracker-summary-mood">{summary.topMood ?? "–"}</dd></div>
            </dl>
            {riskSituationLogs.length > 0 && (
              <ul className="craving-tracker-summary-outcomes" aria-label="ผลลัพธ์สถานการณ์เสี่ยงที่บันทึก">
                {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
                  <li key={value} className={`is-${value}`}>
                    <span>{label}</span>
                    <b>{riskSituationLogs.filter((log) => log.outcome === value).length}</b>
                  </li>
                ))}
              </ul>
            )}
            <p className="craving-tracker-summary-tip"><Sparkles size={14} aria-hidden="true" />การบันทึกทุกวันช่วยให้เห็นแนวโน้มและผลประเมินแม่นยำขึ้น</p>
          </section>
        </div>

        <section className="ui-card craving-tracker-risk-situations">
          <div className="ui-card-head">
            <div>
              <h2 className="craving-tracker-risk-situations-heading">บันทึกสถานการณ์เสี่ยงที่พบจริง</h2>
              <p>บันทึกสถานการณ์ที่เจอ และผลลัพธ์จากการใช้ทักษะรับมือ/ปฏิเสธ</p>
            </div>
            <AlertTriangle size={18} aria-hidden="true" />
          </div>

          <form className="craving-tracker-risk-situation-form" onSubmit={handleRiskSituationSubmit}>
            <label className="ui-field">
              เกิดอะไรขึ้น
              <textarea
                value={riskSituationForm.situation}
                onChange={(e) => setRiskSituationForm((f) => ({ ...f, situation: e.target.value }))}
                rows={3}
                required
              />
            </label>
            <label className="craving-tracker-risk-situation-toggle">
              <input
                type="checkbox"
                checked={riskSituationForm.skillUsed}
                onChange={(e) => setRiskSituationForm((f) => ({ ...f, skillUsed: e.target.checked }))}
              />
              <span>คุณได้ใช้ทักษะรับมือ/ปฏิเสธในสถานการณ์นี้</span>
            </label>
            {riskSituationForm.skillUsed && (
              <label className="ui-field">
                ใช้ทักษะอะไร / ทำอย่างไร
                <input
                  type="text"
                  value={riskSituationForm.skillDescription}
                  onChange={(e) => setRiskSituationForm((f) => ({ ...f, skillDescription: e.target.value }))}
                />
              </label>
            )}
            <label className="ui-field">
              ผลลัพธ์
              <select
                value={riskSituationForm.outcome}
                onChange={(e) => setRiskSituationForm((f) => ({ ...f, outcome: e.target.value }))}
              >
                {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            {riskSituationError && <p className="craving-tracker-risk-situation-error">{riskSituationError}</p>}
            <button type="submit" className="ui-btn ui-btn-primary" disabled={submittingRiskSituation}>
              <Plus size={16} />
              <span>{submittingRiskSituation ? "กำลังบันทึก..." : "บันทึกสถานการณ์"}</span>
            </button>
          </form>

          {riskSituationLogs.length > 0 && (
            <ul className="craving-tracker-risk-situation-list" tabIndex={0} aria-label="สถานการณ์ที่บันทึกไว้ เลื่อนดูได้">
              {riskSituationLogs.map((log) => (
                <li key={log._id} className={`craving-tracker-risk-situation-item craving-tracker-risk-situation-item-${log.outcome}`}>
                  <p className="craving-tracker-risk-situation-item-situation">{log.situation}</p>
                  {log.skillDescription && (
                    <p className="craving-tracker-risk-situation-item-skill">ทักษะที่ใช้: {log.skillDescription}</p>
                  )}
                  <p className="craving-tracker-risk-situation-item-meta">
                    <span>{OUTCOME_LABELS[log.outcome]}</span>
                    <span>{new Date(log.occurredAt).toLocaleDateString("th-TH")}</span>
                  </p>
                </li>
              ))}
            </ul>
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
