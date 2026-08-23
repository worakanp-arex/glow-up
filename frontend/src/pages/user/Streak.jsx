import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Award, CalendarCheck, Flame } from "lucide-react";
import PlantGrowth, { stageLabel, streakToStage } from "../../components/user/PlantGrowth.jsx";
import * as emotionService from "../../services/emotionService.js";
import { WEEKDAY_LABELS, buildCalendarCells, formatThaiDate } from "../../utils/calendarGrid.js";
import { happinessByLevel } from "../../constants/happiness.js";
import "./Streak.css";

function Streak() {
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    emotionService
      .getMyStreak()
      .then(setStreak)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="streak-page">
        <p className="streak-loading">กำลังโหลด...</p>
      </div>
    );
  }

  if (!streak) {
    return (
      <div className="streak-page">
        <p className="streak-loading">ไม่สามารถโหลดข้อมูลได้ในขณะนี้</p>
      </div>
    );
  }

  const stage = streakToStage(streak.currentStreak);

  return (
    <div className="streak-page">
      <Link to="/dashboard" className="streak-back">
        <ArrowLeft size={16} />
        กลับไปแดชบอร์ด
      </Link>

      <div className="streak-hero">
        <PlantGrowth streak={streak.currentStreak} size={200} />
        <h1>{stageLabel(stage)}</h1>
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

      <div className="streak-calendar-section">
        <h2>ปฏิทินการเช็คอิน 12 สัปดาห์ล่าสุด</h2>
        <div className="streak-calendar">
          <div className="streak-calendar-weekdays">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="streak-calendar-grid">
            {buildCalendarCells(streak.history).map((day, index) => {
              if (!day) {
                return <span key={`blank-${index}`} className="streak-calendar-cell streak-calendar-cell-blank" />;
              }
              const happiness = day.happinessLevel ? happinessByLevel(day.happinessLevel) : null;
              const title = happiness
                ? `${formatThaiDate(day.date)} — ${happiness.label}`
                : day.done
                  ? `${formatThaiDate(day.date)} — เช็คอินแล้ว`
                  : formatThaiDate(day.date);
              return (
                <span
                  key={day.date}
                  className={`streak-calendar-cell${day.done ? " streak-calendar-cell-done" : ""}`}
                  style={happiness ? { backgroundColor: happiness.color } : undefined}
                  title={title}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Streak;
