import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { UserRound, AlertTriangle, Award, Building2, CalendarCheck, ClipboardList, Flame, ShieldAlert } from "lucide-react";
import EmotionCalendar from "../../components/user/EmotionCalendar.jsx";
import * as counsellingService from "../../services/counsellingService.js";
import * as weeklyCheckInService from "../../services/weeklyCheckInService.js";
import "./PatientProfile.css";

const MOOD_TREND_LABELS = { improving: "ดีขึ้น", stable: "เหมือนเดิม", worsening: "แย่ลง" };

const RISK_LABELS = { low: "ต่ำ", medium: "ปานกลาง", high: "สูง" };
const RISK_CLASS = {
  low: "patient-profile-risk-low",
  medium: "patient-profile-risk-medium",
  high: "patient-profile-risk-high",
};
const REHAB_STATUS_LABELS = { completed: "เสร็จสิ้นการบำบัด", ongoing: "กำลังบำบัดต่อเนื่อง" };

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("th-TH", { dateStyle: "medium" });
}

function PatientProfile() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState("");
  const [weeklyCheckIns, setWeeklyCheckIns] = useState([]);

  useEffect(() => {
    counsellingService
      .getPatientProfile(userId)
      .then(setData)
      .catch((err) => setError(err.response?.data?.message || "ไม่สามารถโหลดข้อมูลได้"))
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    weeklyCheckInService.getUserWeeklyCheckIns(userId).then(setWeeklyCheckIns).catch(() => setWeeklyCheckIns([]));
  }, [userId]);

  const pageHeader = <PageHeader icon={UserRound} backTo={"/counsellor"} backLabel="คำขอรับคำปรึกษา">{"ข้อมูลผู้รับคำปรึกษา"}</PageHeader>;

  if (loadError) return <div className="patient-profile-page">{pageHeader}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) return <div className="patient-profile-page">{pageHeader}<AsyncState /></div>;
  if (error || !data) return <div className="patient-profile-page">{pageHeader}{error || "ไม่พบข้อมูล"}</div>;

  const { user, rehabRecords, riskAssessments, emotionStreak, emotionLogs } = data;
  const latestRisk = riskAssessments[0];
  const latestWeeklyCheckIn = weeklyCheckIns[0];

  return (
    <div className="patient-profile-page">
      {pageHeader}
      {latestWeeklyCheckIn?.selfHarmRiskFlag && (
        <div className="patient-profile-risk-alert">
          <AlertTriangle size={20} />
          <span>
            ผู้ใช้รายงานความเสี่ยงทำร้ายตนเองในแบบประเมินรายสัปดาห์ล่าสุด ({latestWeeklyCheckIn.isoWeekKey}) —
            กรุณาติดต่อกลับโดยเร็ว
          </span>
        </div>
      )}

      <div className="patient-profile-header">
        <span className="patient-profile-avatar">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.name)}
        </span>
        <div>
          <h2 className="page-context-title">{user.name}</h2>
          <p className="patient-profile-meta">
            {user.email}
            {user.phone && ` · ${user.phone}`}
            {user.age && ` · อายุ ${user.age} ปี`}
          </p>
        </div>
      </div>
      <p className="patient-profile-note">
        หน้านี้สำหรับบุคลากรทางการแพทย์ใช้ประกอบการให้คำปรึกษาเท่านั้น กรุณาเก็บข้อมูลเป็นความลับ
      </p>

      <div className="patient-profile-stats">
        <div className="patient-profile-stat-card">
          <Flame size={20} />
          <span className="patient-profile-stat-value">{emotionStreak.currentStreak}</span>
          <span className="patient-profile-stat-label">วันติดต่อกัน</span>
        </div>
        <div className="patient-profile-stat-card">
          <Award size={20} />
          <span className="patient-profile-stat-value">{emotionStreak.longestStreak}</span>
          <span className="patient-profile-stat-label">สถิติสูงสุด</span>
        </div>
        <div className="patient-profile-stat-card">
          <CalendarCheck size={20} />
          <span className="patient-profile-stat-value">{emotionStreak.totalCheckIns}</span>
          <span className="patient-profile-stat-label">วันที่บันทึกทั้งหมด</span>
        </div>
      </div>

      <section className="patient-profile-card">
        <h2>
          <Building2 size={16} />
          <span>ประวัติการบำบัด</span>
        </h2>
        {rehabRecords.length === 0 ? (
          <p className="patient-profile-empty">ไม่มีข้อมูลการบำบัด</p>
        ) : (
          <ul className="patient-profile-rehab-list">
            {rehabRecords.map((record) => (
              <li key={record._id}>
                <p className="patient-profile-rehab-hospital">{record.hospitalName}</p>
                <p className="patient-profile-rehab-meta">
                  {formatDate(record.startDate)} – {record.endDate ? formatDate(record.endDate) : "ปัจจุบัน"}
                  {record.status && ` · ${REHAB_STATUS_LABELS[record.status] || record.status}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="patient-profile-card">
        <h2>
          <ShieldAlert size={16} />
          <span>ผลประเมินความเสี่ยง</span>
        </h2>
        {!latestRisk ? (
          <p className="patient-profile-empty">ยังไม่มีผลประเมินความเสี่ยง</p>
        ) : (
          <>
            <p className={`patient-profile-risk-result ${RISK_CLASS[latestRisk.level] || ""}`}>
              ระดับความเสี่ยงล่าสุด: <strong>{RISK_LABELS[latestRisk.level] || latestRisk.level}</strong>
              {latestRisk.triggerFactors && <span> — {latestRisk.triggerFactors}</span>}
            </p>
            {riskAssessments.length > 1 && (
              <p className="patient-profile-risk-history">ประเมินไปแล้วทั้งหมด {riskAssessments.length} ครั้ง</p>
            )}
          </>
        )}
      </section>

      <section className="patient-profile-card">
        <h2>
          <ClipboardList size={16} />
          <span>แบบประเมินสภาพจิตใจรายสัปดาห์</span>
        </h2>
        {weeklyCheckIns.length === 0 ? (
          <p className="patient-profile-empty">ยังไม่มีการทำแบบประเมินรายสัปดาห์</p>
        ) : (
          <ul className="patient-profile-weekly-list">
            {weeklyCheckIns.map((entry) => (
              <li key={entry._id} className={entry.selfHarmRiskFlag ? "risk" : ""}>
                <span className="patient-profile-weekly-week">{entry.isoWeekKey}</span>
                <span>ความเครียด {entry.stressLevel}/5</span>
                <span>{MOOD_TREND_LABELS[entry.moodTrend]}</span>
                {entry.selfHarmRiskFlag && (
                  <span className="patient-profile-weekly-risk-tag">
                    <AlertTriangle size={13} />
                    เสี่ยงทำร้ายตนเอง
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <EmotionCalendar logs={emotionLogs} title="ปฏิทินอารมณ์" subtitle="ใช้ประกอบการวิเคราะห์และให้คำปรึกษา" />
    </div>
  );
}

export default PatientProfile;
