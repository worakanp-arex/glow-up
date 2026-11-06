import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, TrendingUp } from "lucide-react";
import StatTile from "../../components/common/StatTile.jsx";
import MoodTrendChart from "../../components/admin/MoodTrendChart.jsx";
import * as riskService from "../../services/riskService.js";
import "./Assessments.css";

function Assessments() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    riskService
      .getRiskSummary()
      .then(setSummary)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="assessments-page"><AsyncState /></div>;
  }

  return (
    <div className="assessments-page">
      <PageHeader icon={ShieldAlert}>ภาพรวมผลประเมินความเสี่ยง</PageHeader>
      <p className="assessments-note">
        <ShieldCheck size={16} />
        <span>
          แสดงเฉพาะสรุปรวมของผู้ใช้ทั้งหมด ได้แก่ จำนวนผู้ใช้ตามระดับความเสี่ยงล่าสุด และค่าเฉลี่ยความสุขรายวัน
          ไม่แสดงบันทึกอารมณ์หรือรายละเอียดรายบุคคล เพื่อความเป็นส่วนตัวของผู้ใช้
        </span>
      </p>
      <div className="assessments-stat-grid">
        <StatTile label="ความเสี่ยงต่ำ" value={summary.byLevel.low} tone="good" />
        <StatTile label="ความเสี่ยงปานกลาง" value={summary.byLevel.medium} tone="warning" />
        <StatTile label="ความเสี่ยงสูง" value={summary.byLevel.high} tone="critical" />
      </div>

      <section className="ui-card assessments-trend">
        <div className="ui-card-head">
          <div>
            <h2>แนวโน้มอารมณ์โดยรวม ({summary.moodTrendDays ?? 30} วันล่าสุด)</h2>
            <p>ค่าเฉลี่ยระดับความสุขที่ผู้ใช้ทุกคนบันทึกในแต่ละวัน (1 = แย่มาก, 7 = ดีมาก)</p>
          </div>
          <TrendingUp size={18} aria-hidden="true" />
        </div>
        {summary.moodTrend?.length ? (
          <MoodTrendChart trend={summary.moodTrend} days={summary.moodTrendDays ?? 30} />
        ) : (
          <p className="assessments-trend-empty">ยังมีข้อมูลการบันทึกอารมณ์ไม่พอที่จะแสดงแนวโน้ม (ต้องมีผู้บันทึกอย่างน้อย 3 คนต่อวัน)</p>
        )}
      </section>
    </div>
  );
}

export default Assessments;
