import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Award, CalendarCheck, ChevronDown, Flame, ShieldAlert } from "lucide-react";
import EmotionCalendar from "../../components/user/EmotionCalendar.jsx";
import { happinessByLevel } from "../../constants/happiness.js";
import { CONTEXT_OPTIONS } from "../../constants/emotionContext.js";
import * as emotionService from "../../services/emotionService.js";
import { groupByMonth, monthGroupLabel } from "../../utils/calendarGrid.js";
import "./UserEmotionHistory.css";

const MONTH_INITIAL_LIMIT = 5;
const MONTH_LOAD_MORE_STEP = 10;

function UserEmotionHistory() {
  const { userId } = useParams();
  const [streak, setStreak] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [monthVisibleCounts, setMonthVisibleCounts] = useState({});

  const historyGroups = useMemo(() => groupByMonth(logs, "date"), [logs]);

  function getMonthVisibleCount(key) {
    return monthVisibleCounts[key] ?? MONTH_INITIAL_LIMIT;
  }

  function showMoreForMonth(key, total) {
    setMonthVisibleCounts((prev) => ({
      ...prev,
      [key]: Math.min((prev[key] ?? MONTH_INITIAL_LIMIT) + MONTH_LOAD_MORE_STEP, total),
    }));
  }

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

      <EmotionCalendar logs={logs} />

      <h2 className="user-emotion-history-list-heading">ประวัติการบันทึกทั้งหมด</h2>
      {logs.length === 0 ? (
        <p className="user-emotion-history-empty">ผู้ใช้งานนี้ยังไม่มีบันทึก</p>
      ) : (
        historyGroups.map((group) => {
          const visibleCount = getMonthVisibleCount(group.key);
          const visibleItems = group.items.slice(0, visibleCount);
          return (
            <div key={group.key} className="user-emotion-history-month-group">
              <h3 className="user-emotion-history-month-heading">{monthGroupLabel(group.year, group.month)}</h3>
              <ul className="user-emotion-history-list">
                {visibleItems.map((log) => {
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
              {visibleCount < group.items.length && (
                <button
                  type="button"
                  className="btn btn-secondary user-emotion-history-load-more"
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
  );
}

export default UserEmotionHistory;
