import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import StatTile from "../common/StatTile.jsx";
import * as overviewService from "../../services/overviewService.js";
import "./PatientOverviewWidget.css";

function PatientOverviewWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    overviewService
      .getOverview()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="patient-overview-widget">
      <div className="patient-overview-widget-header">
        <h2>
          <Users size={18} />
          <span>ภาพรวมผู้ใช้งาน</span>
        </h2>
        <Link to="/counsellor/analytics" className="patient-overview-widget-link">
          ดูรายละเอียด →
        </Link>
      </div>
      {loading ? (
        <p className="patient-overview-widget-loading">กำลังโหลด...</p>
      ) : !data ? (
        <p className="patient-overview-widget-loading">ไม่สามารถโหลดข้อมูลภาพรวมได้</p>
      ) : (
        <div className="patient-overview-widget-grid">
          <StatTile label={`ใช้งานใน ${data.activeUsers.windowDays} วันล่าสุด`} value={data.activeUsers.count} tone="neutral" />
          <StatTile
            label="มีความเสี่ยง (ปานกลาง+สูง)"
            value={data.risk.byLevel.medium + data.risk.byLevel.high}
            tone="warning"
          />
          <StatTile label="นัดหมายวันนี้" value={data.appointments.today} tone="neutral" />
        </div>
      )}
    </section>
  );
}

export default PatientOverviewWidget;
