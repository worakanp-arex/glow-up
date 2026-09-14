import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, CalendarCheck, Flame } from "lucide-react";
import PlantGrowth, { stageLabel, streakToStage } from "../../components/user/PlantGrowth.jsx";
import MissionBoard from "../../components/user/MissionBoard.jsx";
import * as emotionService from "../../services/emotionService.js";
import CheckinCalendar from "../../components/user/CheckinCalendar.jsx";
import PointsSummary from "../../components/user/PointsSummary.jsx";
import "./Streak.css";

function Streak() {
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    emotionService
      .getMyStreak()
      .then(setStreak)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  const pageHeader = <PageHeader icon={Award} backTo={"/dashboard"} backLabel="หน้าหลัก">{"ความก้าวหน้าและรางวัล"}</PageHeader>;

  if (loadError) return <div className="streak-page">{pageHeader}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) {
    return (
      <div className="streak-page">
      {pageHeader}
        <div className="streak-loading"><AsyncState /></div>
      </div>
    );
  }

  if (!streak) {
    return (
      <div className="streak-page">
      {pageHeader}
        <p className="streak-loading">ไม่สามารถโหลดข้อมูลได้ในขณะนี้</p>
      </div>
    );
  }

  const stage = streakToStage(streak.currentStreak);

  return (
    <div className="streak-page">
      {pageHeader}
      <div className="streak-hero">
        <PlantGrowth streak={streak.currentStreak} size={200} />
        <h2 className="page-context-title">{stageLabel(stage)}</h2>
        <p>
          {streak.currentStreak > 0
            ? `เช็คอินต่อเนื่องมาแล้ว ${streak.currentStreak} วัน — เก็บสถิติไว้ให้ต้นไม้ของคุณเติบโตต่อไป`
            : "เริ่มเช็คอินวันนี้เพื่อปลูกต้นไม้ต้นแรกของคุณ"}
        </p>
        {!streak.loggedToday && (
          <Link to="/dashboard" className="btn btn-primary">
            เช็คอินวันนี้
          </Link>
        )}
      </div>

      <div className="streak-stats">
        <div className="streak-stat-card">
          <Flame size={20} />
          <span className="streak-stat-value">{streak.currentStreak}</span>
          <span className="streak-stat-label">วันติดต่อกัน</span>
        </div>
        <div className="streak-stat-card">
          <Award size={20} />
          <span className="streak-stat-value">{streak.longestStreak}</span>
          <span className="streak-stat-label">สถิติสูงสุด</span>
        </div>
        <div className="streak-stat-card">
          <CalendarCheck size={20} />
          <span className="streak-stat-value">{streak.totalCheckIns}</span>
          <span className="streak-stat-label">วันที่เช็คอินทั้งหมด</span>
        </div>
      </div>

      <PointsSummary />
      <CheckinCalendar history={streak.history} />

      <MissionBoard />
    </div>
  );
}

export default Streak;
