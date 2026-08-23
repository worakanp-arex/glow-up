import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Award, Briefcase, CalendarCheck, Flame, Globe, MoreHorizontal, ShieldAlert, Users } from "lucide-react";
import EmotionCalendar from "../../components/user/EmotionCalendar.jsx";
import { happinessByLevel } from "../../constants/happiness.js";
import * as emotionService from "../../services/emotionService.js";
import "./UserEmotionHistory.css";

const CONTEXT_OPTIONS = [
  { value: "work", label: "การทำงาน", icon: Briefcase },
  { value: "family", label: "ครอบครัว", icon: Users },
  { value: "environment", label: "สิ่งแวดล้อม", icon: Globe },
  { value: "other", label: "อื่นๆ", icon: MoreHorizontal },
];

function UserEmotionHistory() {
  const { userId } = useParams();
  const [streak, setStreak] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([emotionService.getUserStreak(userId), emotionService.getUserEmotionLogs(userId)])
      .then(([streakData, logsData]) => {
        setStreak(streakData);
        setLogs(logsData);
      })
      .catch((err) => setError(err.response?.data?.message || "ไม่สามารถโหลดข้อมูลได้"))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <div className="user-emotion-history-page">กำลังโหลด...</div>;
  }
  if (error || !streak) {
    return <div className="user-emotion-history-page">{error || "ไม่พบข้อมูล"}</div>;
  }

  return (
    <div className="user-emotion-history-page">
      <Link to="/admin/users" className="user-emotion-history-back">
        <ArrowLeft size={16} />
        กลับไปจัดการผู้ใช้งาน
      </Link>

      <div className="user-emotion-history-header">
        <h1>
          <ShieldAlert size={22} />
          <span>ประวัติอารมณ์และความอยาก</span>
        </h1>
        <p className="user-emotion-history-patient">
          {streak.user.name} · {streak.user.email}
        </p>
        <p className="user-emotion-history-note">
          หน้านี้สำหรับผู้ดูแลระบบใช้ประกอบการวิเคราะห์และดูแลผู้ใช้งานเท่านั้น กรุณาเก็บข้อมูลเป็นความลับ
        </p>
      </div>

      <div className="user-emotion-history-stats">
        <div className="user-emotion-history-stat-card">
          <Flame size={20} />
          <span className="user-emotion-history-stat-value">{streak.currentStreak}</span>
          <span className="user-emotion-history-stat-label">วันติดต่อกัน</span>
        </div>
        <div className="user-emotion-history-stat-card">
          <Award size={20} />
          <span className="user-emotion-history-stat-value">{streak.longestStreak}</span>
          <span className="user-emotion-history-stat-label">สถิติสูงสุด</span>
        </div>
        <div className="user-emotion-history-stat-card">
          <CalendarCheck size={20} />
          <span className="user-emotion-history-stat-value">{streak.totalCheckIns}</span>
          <span className="user-emotion-history-stat-label">วันที่บันทึกทั้งหมด</span>
        </div>
      </div>

      <EmotionCalendar history={streak.history} />

      <h2 className="user-emotion-history-list-heading">ประวัติการบันทึกทั้งหมด</h2>
      {logs.length === 0 ? (
        <p className="user-emotion-history-empty">ผู้ใช้งานนี้ยังไม่มีบันทึก</p>
      ) : (
        <ul className="user-emotion-history-list">
          {logs.map((log) => {
            const context = CONTEXT_OPTIONS.find((c) => c.value === log.context);
            const happiness = log.happinessLevel ? happinessByLevel(log.happinessLevel) : null;
            const HappinessIcon = happiness?.icon;
            return (
              <li key={log._id}>
                <div
                  className="user-emotion-history-list-icon"
                  style={happiness ? { backgroundColor: happiness.color, color: "#fff" } : undefined}
                >
                  {HappinessIcon ? <HappinessIcon size={18} /> : <ShieldAlert size={18} />}
                </div>
                <div className="user-emotion-history-list-body">
                  <p className="user-emotion-history-mood">{happiness?.label || "ยังไม่ระบุระดับความสุข"}</p>
                  <p className="user-emotion-history-meta">
                    {new Date(log.date).toLocaleDateString("th-TH")}
                    {context && ` · ${context.label}`}
                  </p>
                  {log.note && <p className="user-emotion-history-notetext">{log.note}</p>}
                </div>
                {log.cravingLevel != null && (
                  <span className="user-emotion-history-badge">อยาก {log.cravingLevel}/10</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default UserEmotionHistory;
