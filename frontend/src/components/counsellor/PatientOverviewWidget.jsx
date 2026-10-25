import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import StatTile from "../common/StatTile.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import * as overviewService from "../../services/overviewService.js";
import "./PatientOverviewWidget.css";

function PatientOverviewWidget() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    overviewService
      .getOverview()
      .then((result) => setData(Array.isArray(result) ? null : result))
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
          <StatTile label={`ใช้งานใน ${data.activeUsers.windowDays} วันล่าสุด`} value={data.activeUsers.count} tone="neutral" to="/counsellor/overview/active" hint="กดเพื่อดูว่าเป็นใคร" />
          <StatTile
            label="มีความเสี่ยง (ปานกลาง+สูง)"
            value={data.risk.byLevel.medium + data.risk.byLevel.high}
            tone="warning"
            to={user.role === "counsellor" ? "/counsellor/overview/risk" : undefined}
            hint={user.role === "counsellor" ? "กดเพื่อดูรายชื่อ" : undefined}
          />
          <StatTile label="นัดหมายวันนี้" value={data.appointments.today} tone="neutral" to="/counsellor/overview/appointments" hint="กดเพื่อดูรายการนัด" />
        </div>
      )}
    </section>
  );
}

export default PatientOverviewWidget;
