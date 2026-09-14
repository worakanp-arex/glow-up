import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { getMyPointsSummary } from "../../services/missionService.js";
import "./PointsSummary.css";

export default function PointsSummary() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(false);
  function load() {
    setError(false);
    getMyPointsSummary().then(setSummary).catch(() => setError(true));
  }
  useEffect(() => { load(); }, []);
  return <section className="points-summary" aria-label="คะแนนของฉัน">
    <Award size={28} aria-hidden="true" />
    <div><span>คะแนนของฉัน</span>
      {error ? <button type="button" onClick={load}>โหลดคะแนนอีกครั้ง</button> : <>
        <strong>{summary ? `${summary.totalPoints ?? 0} แต้ม` : "กำลังโหลด..."}</strong>
        <small>คะแนนสะสมจากภารกิจที่สำเร็จ{summary && ` ${summary.completedMissions ?? 0} ภารกิจ`}</small>
      </>}
    </div>
  </section>;
}
