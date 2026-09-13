import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import StatTile from "../../components/common/StatTile.jsx";
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
          แสดงเฉพาะสรุปจำนวนผู้ใช้ตามระดับความเสี่ยงล่าสุด ไม่แสดงบันทึกอารมณ์หรือรายละเอียดรายบุคคล
          เพื่อความเป็นส่วนตัวของผู้ใช้
        </span>
      </p>
      <div className="assessments-stat-grid">
        <StatTile label="ความเสี่ยงต่ำ" value={summary.byLevel.low} tone="good" />
        <StatTile label="ความเสี่ยงปานกลาง" value={summary.byLevel.medium} tone="warning" />
        <StatTile label="ความเสี่ยงสูง" value={summary.byLevel.high} tone="critical" />
      </div>
    </div>
  );
}

export default Assessments;
