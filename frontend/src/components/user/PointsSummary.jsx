import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { getMyPointsSummary } from "../../services/missionService.js";
import { levelProgress } from "../../utils/levelProgress.js";
import "./PointsSummary.css";

export default function PointsSummary() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(false);
  function load() {
    setError(false);
    getMyPointsSummary().then(setSummary).catch(() => setError(true));
  }
  useEffect(() => { load(); }, []);
  const progress = summary && levelProgress(summary);
  return <section className="points-summary" aria-label="คะแนนของฉัน">
    <Award size={28} aria-hidden="true" />
    <div><span>คะแนนของฉัน</span>
      {error ? <button type="button" onClick={load}>โหลดคะแนนอีกครั้ง</button> : <>
        <strong>
          {summary ? `${summary.totalPoints ?? 0} แต้ม · เลเวล ${progress.level}` : "กำลังโหลด..."}
        </strong>
        {progress && <div className="points-summary-bar">
          <div className="ui-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-label={`ความคืบหน้าเลเวล ${progress.level}`}>
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="points-summary-percent">
            <b>{progress.percent}%</b> ของเลเวล {progress.level}
            <span>อีก {progress.remainingPercent}% ({progress.remaining} แต้ม) ถึงเลเวล {progress.level + 1}</span>
          </p>
        </div>}
        <small>
          คะแนนสะสมจากภารกิจที่สำเร็จ{summary && ` ${summary.completedMissions ?? 0} ภารกิจ`}
        </small>
      </>}
    </div>
  </section>;
}
