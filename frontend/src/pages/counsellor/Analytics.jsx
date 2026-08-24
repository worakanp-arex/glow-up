import { useEffect, useState } from "react";
import { BarChart3, CalendarClock, ShieldAlert, Trophy, Users } from "lucide-react";
import StatTile from "../../components/common/StatTile.jsx";
import * as overviewService from "../../services/overviewService.js";
import "./Analytics.css";

function shortDay(dateKey) {
  return dateKey.split("-")[2];
}

function formatFullDate(dateKey) {
  return new Date(`${dateKey}T00:00:00+07:00`).toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatDayRow(dateKey) {
  return new Date(`${dateKey}T00:00:00+07:00`).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function TrendChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="overview-trend-chart">
      {data.map((d) => (
        <div key={d.dateKey} className="overview-trend-bar-col">
          <div
            className="overview-trend-bar"
            style={{ height: `${(d.count / max) * 100}%` }}
            data-tooltip={`${formatFullDate(d.dateKey)}: ${d.count} คน`}
          />
          <span className="overview-trend-bar-label">{shortDay(d.dateKey)}</span>
        </div>
      ))}
    </div>
  );
}

function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    overviewService
      .getOverview()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="counsellor-analytics-page">กำลังโหลด...</div>;
  }
  if (!data) {
    return <div className="counsellor-analytics-page">ไม่สามารถโหลดข้อมูลภาพรวมได้</div>;
  }

  return (
    <div className="counsellor-analytics-page">
      <h1>
        <BarChart3 size={22} />
        <span>ภาพรวมผู้ใช้งาน</span>
      </h1>
      <p className="counsellor-analytics-subtitle">
        ข้อมูลสรุปการใช้งานของผู้ผ่านการบำบัด สำหรับบุคลากรทางการแพทย์
      </p>

      <div className="counsellor-analytics-stat-grid">
        <StatTile label={`ใช้งานใน ${data.activeUsers.windowDays} วันล่าสุด`} value={data.activeUsers.count} tone="neutral" />
        <StatTile label="ความเสี่ยงต่ำ" value={data.risk.byLevel.low} tone="good" />
        <StatTile label="ความเสี่ยงปานกลาง" value={data.risk.byLevel.medium} tone="warning" />
        <StatTile label="ความเสี่ยงสูง" value={data.risk.byLevel.high} tone="critical" />
        <StatTile label="นัดหมายวันนี้" value={data.appointments.today} tone="neutral" />
      </div>

      <section className="counsellor-analytics-section">
        <h2>
          <BarChart3 size={16} />
          <span>แนวโน้มการใช้งานรายวัน (14 วันล่าสุด)</span>
        </h2>
        {data.loginTrend.every((d) => d.count === 0) ? (
          <p className="counsellor-analytics-empty">ยังไม่มีข้อมูลการเข้าใช้งานในช่วงนี้</p>
        ) : (
          <TrendChart data={data.loginTrend} />
        )}
      </section>

      <section className="counsellor-analytics-section">
        <h2>
          <CalendarClock size={16} />
          <span>นัดหมายรายวัน (7 วันข้างหน้า)</span>
        </h2>
        {data.appointments.byDay.length === 0 ? (
          <p className="counsellor-analytics-empty">ยังไม่มีนัดหมายในช่วงนี้</p>
        ) : (
          <ul className="counsellor-analytics-day-list">
            {data.appointments.byDay.map((d) => (
              <li key={d.dateKey}>
                <span>{formatDayRow(d.dateKey)}</span>
                <strong>{d.count} คน</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="counsellor-analytics-section">
        <h2>
          <Trophy size={16} />
          <span>อันดับผู้ใช้งานบ่อย (30 วันล่าสุด)</span>
        </h2>
        {data.leaderboard.length === 0 ? (
          <p className="counsellor-analytics-empty">ยังไม่มีข้อมูลเพียงพอสำหรับจัดอันดับ</p>
        ) : (
          <ol className="counsellor-analytics-leaderboard">
            {data.leaderboard.map((entry, index) => (
              <li key={entry.userId}>
                <span className="counsellor-analytics-rank">{index + 1}</span>
                <span className="counsellor-analytics-leaderboard-name">
                  <Users size={14} />
                  {entry.name}
                </span>
                <span className="counsellor-analytics-leaderboard-days">{entry.days} วัน</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="counsellor-analytics-note">
        <ShieldAlert size={14} />
        <span>
          "จำนวนคนเสี่ยง" นับเฉพาะผู้ที่เคยกดประเมินความเสี่ยงด้วยตนเองอย่างน้อยหนึ่งครั้ง
          ใช้เกณฑ์คำนวณอัตโนมัติแบบง่าย ไม่ใช่การวินิจฉัยทางการแพทย์
        </span>
      </p>
    </div>
  );
}

export default Analytics;
