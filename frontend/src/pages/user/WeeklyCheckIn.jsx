import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ClipboardList, HeartHandshake, Lock, Minus, Phone, TrendingDown, TrendingUp } from "lucide-react";
import * as weeklyCheckInService from "../../services/weeklyCheckInService.js";
import { getIsoWeekKey } from "../../utils/isoWeek.js";
import "../../components/user/DailyCheckin.css";
import "./WeeklyCheckIn.css";

const STRESS_LEVELS = [
  { level: 1, label: "น้อยมาก" },
  { level: 2, label: "น้อย" },
  { level: 3, label: "ปานกลาง" },
  { level: 4, label: "มาก" },
  { level: 5, label: "มากที่สุด" },
];
const MOOD_TREND_LABELS = {
  improving: "ดีขึ้นกว่าสัปดาห์ก่อน",
  stable: "เหมือนเดิม",
  worsening: "แย่ลงกว่าสัปดาห์ก่อน",
};
const MOOD_TREND_ICONS = { improving: TrendingUp, stable: Minus, worsening: TrendingDown };

const INITIAL_FORM = { stressLevel: 3, moodTrend: "stable", selfHarmRiskFlag: false, notes: "" };

function WeeklyCheckIn() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    weeklyCheckInService
      .getMyWeeklyCheckIns()
      .then(setHistory)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  const thisWeekKey = getIsoWeekKey();
  const thisWeekEntry = history.find((entry) => entry.isoWeekKey === thisWeekKey);
  const doneThisWeek = Boolean(thisWeekEntry) || justSubmitted;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await weeklyCheckInService.submitWeeklyCheckIn(form);
      setHistory((prev) => [created, ...prev.filter((entry) => entry.isoWeekKey !== created.isoWeekKey)]);
      setJustSubmitted(true);
      setForm(INITIAL_FORM);
    } finally {
      setSubmitting(false);
    }
  }

  const pageHeader = (
    <PageHeader icon={ClipboardList} eyebrow="Weekly check-in" backTo="/dashboard" backLabel="หน้าหลัก" description="ใช้เวลาไม่ถึงนาที ช่วยให้ทีมดูแลคุณได้ทันท่วงทีหากมีความเสี่ยง">
      แบบประเมินสภาพจิตใจรายสัปดาห์
    </PageHeader>
  );

  if (loadError) return <div className="weekly-checkin-page">{pageHeader}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) {
    return <div className="weekly-checkin-page">{pageHeader}<AsyncState /></div>;
  }

  return (
    <div className="weekly-checkin-page">
      {pageHeader}

      <div className="weekly-checkin-layout">
        <section className="ui-card weekly-checkin-main">
          <div className="checkin-top">
            <span className="ui-chip"><ClipboardList size={12} aria-hidden="true" />สัปดาห์นี้ · {thisWeekKey}</span>
            <span className="checkin-private"><Lock size={12} aria-hidden="true" />เฉพาะคุณและทีมดูแล</span>
          </div>

          {doneThisWeek ? (
            <div className="weekly-checkin-done">
              <span className="weekly-checkin-done-icon"><CheckCircle2 size={28} /></span>
              <h2>ทำแบบประเมินสัปดาห์นี้แล้ว</h2>
              <p>ขอบคุณที่สละเวลาดูแลตัวเอง กลับมาใหม่สัปดาห์หน้าได้เลย</p>
              {(thisWeekEntry || history[0]) && (
                <dl className="weekly-checkin-done-summary">
                  <div><dt>ความเครียด</dt><dd>{(thisWeekEntry || history[0]).stressLevel}<small> / 5</small></dd></div>
                  <div><dt>แนวโน้มอารมณ์</dt><dd className="is-text">{MOOD_TREND_LABELS[(thisWeekEntry || history[0]).moodTrend]}</dd></div>
                </dl>
              )}
              <div className="weekly-checkin-done-actions">
                <Link to="/craving-tracker" className="ui-btn ui-btn-outline">บันทึกอารมณ์รายวัน</Link>
                <Link to="/counselling" className="ui-btn ui-btn-primary">อยากคุยกับผู้ให้คำปรึกษา</Link>
              </div>
            </div>
          ) : (
            <form className="weekly-checkin-form" onSubmit={handleSubmit}>
              <h2 className="checkin-title">สัปดาห์นี้เป็นอย่างไรบ้าง?</h2>

              <fieldset className="weekly-checkin-field">
                <legend>ระดับความเครียดสัปดาห์นี้</legend>
                <div className="weekly-checkin-stress-picker" role="radiogroup" aria-label="ระดับความเครียดสัปดาห์นี้">
                  {STRESS_LEVELS.map(({ level, label }) => (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={form.stressLevel === level}
                      className={`weekly-checkin-stress-btn level-${level}${form.stressLevel === level ? " active" : ""}`}
                      onClick={() => setForm((prev) => ({ ...prev, stressLevel: level }))}
                    >
                      <b>{level}</b>
                      <small>{label}</small>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="weekly-checkin-field">
                <legend>แนวโน้มอารมณ์เทียบกับสัปดาห์ก่อน</legend>
                <div className="weekly-checkin-trend" role="radiogroup" aria-label="แนวโน้มอารมณ์เทียบกับสัปดาห์ก่อน">
                  {Object.entries(MOOD_TREND_LABELS).map(([value, label]) => {
                    const Icon = MOOD_TREND_ICONS[value];
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={form.moodTrend === value}
                        className={`weekly-checkin-trend-btn trend-${value}${form.moodTrend === value ? " active" : ""}`}
                        onClick={() => setForm((prev) => ({ ...prev, moodTrend: value }))}
                      >
                        <Icon size={18} aria-hidden="true" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="weekly-checkin-risk-flag">
                <input
                  type="checkbox"
                  checked={form.selfHarmRiskFlag}
                  onChange={(e) => setForm((prev) => ({ ...prev, selfHarmRiskFlag: e.target.checked }))}
                />
                <span>ช่วงนี้มีความคิดอยากทำร้ายตนเอง</span>
              </label>
              {form.selfHarmRiskFlag && (
                <p className="weekly-checkin-risk-note">
                  ทีมดูแลจะได้รับแจ้งเตือนทันทีเพื่อติดต่อกลับหาคุณ หากอยู่ในภาวะฉุกเฉิน กรุณาโทร 1323
                  สายด่วนสุขภาพจิต
                </p>
              )}

              <label className="checkin-note">
                <span>บันทึกเพิ่มเติม <small>(ไม่บังคับ)</small></span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="มีอะไรที่อยากให้ทีมดูแลรู้ไหม..."
                />
              </label>

              <div className="checkin-foot">
                <span className="ui-muted">ใช้เวลาไม่ถึง 1 นาที</span>
                <button type="submit" className="ui-btn ui-btn-primary" disabled={submitting}>
                  {submitting ? "กำลังบันทึก..." : "ส่งแบบประเมิน"}
                </button>
              </div>
            </form>
          )}
        </section>

        <aside className="weekly-checkin-side">
          <section className="ui-card weekly-checkin-history">
            <div className="ui-card-head">
              <h2>ประวัติการประเมิน</h2>
              {history.length > 0 && <span className="ui-chip">{history.length} สัปดาห์</span>}
            </div>
            {history.length === 0 ? (
              <p className="weekly-checkin-history-empty">ยังไม่มีประวัติ — การประเมินครั้งแรกจะแสดงที่นี่</p>
            ) : (
              <ul>
                {history.map((entry) => {
                  const Icon = MOOD_TREND_ICONS[entry.moodTrend] || Minus;
                  return (
                    <li key={entry._id}>
                      <span className={`weekly-checkin-history-stress level-${entry.stressLevel}`} title="ระดับความเครียด">{entry.stressLevel}</span>
                      <div>
                        <strong className="weekly-checkin-history-week">{entry.isoWeekKey}</strong>
                        <small className={`trend-${entry.moodTrend}`}><Icon size={12} aria-hidden="true" />{MOOD_TREND_LABELS[entry.moodTrend]}</small>
                      </div>
                      <span className="weekly-checkin-history-label">ความเครียด {entry.stressLevel}/5</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="ui-card ui-card-soft weekly-checkin-help">
            <span className="weekly-checkin-help-icon" aria-hidden="true"><HeartHandshake size={20} /></span>
            <h2>ต้องการคนรับฟังตอนนี้?</h2>
            <p>ไม่ต้องรอถึงสัปดาห์หน้า คุณขอคำปรึกษาได้ทุกเมื่อ</p>
            <Link to="/counselling" className="ui-btn ui-btn-outline ui-btn-block">ขอคำปรึกษา</Link>
            <a href="tel:1323" className="weekly-checkin-hotline"><Phone size={14} aria-hidden="true" />สายด่วนสุขภาพจิต 1323 (24 ชม.)</a>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default WeeklyCheckIn;
