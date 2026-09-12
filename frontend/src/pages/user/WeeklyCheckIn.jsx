import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ClipboardList } from "lucide-react";
import * as weeklyCheckInService from "../../services/weeklyCheckInService.js";
import { getIsoWeekKey } from "../../utils/isoWeek.js";
import "./WeeklyCheckIn.css";

const STRESS_LEVELS = [1, 2, 3, 4, 5];
const MOOD_TREND_LABELS = {
  improving: "ดีขึ้นกว่าสัปดาห์ก่อน",
  stable: "เหมือนเดิม",
  worsening: "แย่ลงกว่าสัปดาห์ก่อน",
};

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

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="weekly-checkin-page"><AsyncState /></div>;
  }

  return (
    <div className="weekly-checkin-page">
      <Link to="/dashboard" className="weekly-checkin-back">
        <ArrowLeft size={16} />
        กลับไปแดชบอร์ด
      </Link>

      <h1>
        <ClipboardList size={22} />
        <span>แบบประเมินสภาพจิตใจรายสัปดาห์</span>
      </h1>
      <p className="weekly-checkin-subtitle">ใช้เวลาไม่ถึงนาที ช่วยให้ทีมดูแลคุณได้ทันท่วงทีหากมีความเสี่ยง</p>

      {doneThisWeek ? (
        <div className="weekly-checkin-done">
          <CheckCircle2 size={22} />
          <p>ทำแบบประเมินสัปดาห์นี้แล้ว กลับมาใหม่สัปดาห์หน้าได้เลย</p>
        </div>
      ) : (
        <form className="weekly-checkin-form" onSubmit={handleSubmit}>
          <label>
            ระดับความเครียดสัปดาห์นี้ (1 = น้อยที่สุด, 5 = มากที่สุด)
            <div className="weekly-checkin-stress-picker" role="radiogroup">
              {STRESS_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={form.stressLevel === level}
                  className={`weekly-checkin-stress-btn${form.stressLevel === level ? " active" : ""}`}
                  onClick={() => setForm((prev) => ({ ...prev, stressLevel: level }))}
                >
                  {level}
                </button>
              ))}
            </div>
          </label>

          <label>
            แนวโน้มอารมณ์เทียบกับสัปดาห์ก่อน
            <select
              value={form.moodTrend}
              onChange={(e) => setForm((prev) => ({ ...prev, moodTrend: e.target.value }))}
            >
              {Object.entries(MOOD_TREND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

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

          <label>
            บันทึกเพิ่มเติม (ไม่บังคับ)
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "กำลังบันทึก..." : "ส่งแบบประเมิน"}
          </button>
        </form>
      )}

      {history.length > 0 && (
        <div className="weekly-checkin-history">
          <h2>ประวัติการประเมิน</h2>
          <ul>
            {history.map((entry) => (
              <li key={entry._id}>
                <span className="weekly-checkin-history-week">{entry.isoWeekKey}</span>
                <span>ความเครียด {entry.stressLevel}/5</span>
                <span>{MOOD_TREND_LABELS[entry.moodTrend]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default WeeklyCheckIn;
