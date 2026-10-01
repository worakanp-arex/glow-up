import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Sprout } from "lucide-react";
import { getMyPointsSummary } from "../../services/missionService.js";
import { stageLabel, streakToStage } from "./PlantGrowth.jsx";
import "./GrowthCard.css";

const WEEKDAY = new Intl.DateTimeFormat("th-TH", { weekday: "short", timeZone: "UTC" });

// Level/XP come from the existing points summary (missions + activities +
// games); the week strip comes from the emotion check-in streak history.
export default function GrowthCard({ streak }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    getMyPointsSummary().then(setSummary).catch(() => setError(true));
  }
  useEffect(() => { load(); }, []);

  const perLevel = summary?.pointsPerLevel || 100;
  const total = summary?.totalPoints ?? 0;
  const level = summary?.level ?? 1 + Math.floor(total / perLevel);
  const levelXp = total - (level - 1) * perLevel;
  const toNext = summary?.pointsToNextLevel ?? level * perLevel - total;
  const week = (streak?.history ?? []).slice(-7);

  return (
    <section className="ui-card growth-card" aria-label="การเติบโตของฉัน">
      <div className="ui-card-head">
        <h2>การเติบโตของฉัน</h2>
        <Sprout size={18} aria-hidden="true" />
      </div>

      {error ? (
        <button type="button" className="ui-card-link" onClick={load}>โหลดข้อมูลอีกครั้ง</button>
      ) : (
        <>
          <div className="growth-card-level">
            <span className="growth-card-badge" aria-hidden="true"><Sprout size={30} /></span>
            <div>
              <span className="ui-chip">LEVEL {summary ? level : "–"}</span>
              <strong>{stageLabel(streakToStage(streak?.currentStreak ?? 0))}</strong>
              <small>{summary ? `${levelXp} / ${perLevel} XP` : "กำลังโหลด..."}</small>
            </div>
          </div>
          <div className="ui-progress" role="progressbar" aria-valuemin={0} aria-valuemax={perLevel} aria-valuenow={levelXp} aria-label="ความคืบหน้าเลเวล">
            <span style={{ width: `${Math.min(100, (levelXp / perLevel) * 100)}%` }} />
          </div>
          {summary && <p className="ui-muted growth-card-next">อีก {toNext} XP ถึงระดับถัดไป</p>}
        </>
      )}

      <hr className="ui-divider" />
      <div className="growth-card-stats">
        <div><strong>{summary?.completedMissions ?? "–"}</strong><span>ภารกิจสำเร็จ</span></div>
        <div><strong>{streak?.currentStreak ?? 0}<small>วัน</small></strong><span>ทำกิจกรรมต่อเนื่อง</span></div>
      </div>

      {week.length > 0 && (
        <>
          <hr className="ui-divider" />
          <ol className="growth-card-week" aria-label="เช็คอิน 7 วันล่าสุด">
            {week.map((day, i) => {
              const isToday = i === week.length - 1;
              return (
                <li key={day.date} className={day.done ? "is-done" : isToday ? "is-today" : ""}>
                  <span>{isToday ? "วันนี้" : WEEKDAY.format(new Date(`${day.date}T00:00:00Z`))}</span>
                  <i aria-label={day.done ? "เช็คอินแล้ว" : "ยังไม่เช็คอิน"}>{day.done ? <Check size={13} /> : isToday ? "•" : "–"}</i>
                </li>
              );
            })}
          </ol>
        </>
      )}
      <Link to="/streak" className="growth-card-foot">คะแนนสะท้อนการร่วมกิจกรรม ไม่ใช่ผลสุขภาพ</Link>
    </section>
  );
}
