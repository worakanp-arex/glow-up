import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, ClipboardList, HeartPulse, LayoutDashboard, Users } from "lucide-react";
import StatTile from "../../components/common/StatTile.jsx";
import * as adminService from "../../services/adminService.js";
import "./Dashboard.css";

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getDashboard()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="dashboard-page">กำลังโหลด...</div>;
  }

  return (
    <div className="dashboard-page">
      <h1>
        <LayoutDashboard size={22} />
        <span>แผงควบคุมผู้ดูแลระบบ</span>
      </h1>
      <p className="dashboard-subtitle">ภาพรวมผู้ใช้งาน ประกาศงาน ใบสมัคร และความเสี่ยงในระบบทั้งหมด</p>

      <div className="dashboard-links">
        <Link to="/admin/users">
          <Users size={16} />
          <span>จัดการผู้ใช้งาน</span>
        </Link>
        <Link to="/admin/jobs">
          <Briefcase size={16} />
          <span>ตรวจสอบประกาศงาน</span>
        </Link>
        <Link to="/admin/assessments">
          <ClipboardList size={16} />
          <span>ผลประเมินความเสี่ยง</span>
        </Link>
      </div>

      <section className="dashboard-stat-group">
        <h2>
          <Users size={16} />
          <span>ผู้ใช้งาน</span>
        </h2>
        <div className="dashboard-stat-grid">
          <StatTile label="ผู้หางานทั้งหมด" value={stats.users.total} />
          <StatTile label="นายจ้างทั้งหมด" value={stats.users.employers} />
          <StatTile
            label="รอการยืนยันบัญชี"
            value={stats.users.pendingVerifications}
            tone={stats.users.pendingVerifications > 0 ? "warning" : "neutral"}
          />
        </div>
      </section>

      <section className="dashboard-stat-group">
        <h2>
          <Briefcase size={16} />
          <span>ประกาศงาน</span>
        </h2>
        <div className="dashboard-stat-grid">
          <StatTile label="ประกาศงานทั้งหมด" value={stats.jobs.total} />
          <StatTile
            label="รอยืนยันประกาศงาน"
            value={stats.jobs.pending}
            tone={stats.jobs.pending > 0 ? "warning" : "neutral"}
          />
          <StatTile label="เปิดรับสมัครอยู่" value={stats.jobs.open} tone="good" />
        </div>
      </section>

      <section className="dashboard-stat-group">
        <h2>
          <ClipboardList size={16} />
          <span>ใบสมัครงาน</span>
        </h2>
        <div className="dashboard-stat-grid">
          <StatTile label="ใบสมัครทั้งหมด" value={stats.applications.total} />
          <StatTile label="รอดำเนินการ" value={stats.applications.byStatus.pending} />
          <StatTile label="นัดสัมภาษณ์" value={stats.applications.byStatus.interview} />
          <StatTile label="ผ่านการคัดเลือก" value={stats.applications.byStatus.passed} tone="good" />
          <StatTile label="ถูกปฏิเสธ" value={stats.applications.byStatus.rejected} />
        </div>
      </section>

      <section className="dashboard-stat-group">
        <h2>
          <HeartPulse size={16} />
          <span>ความเสี่ยงการเสพซ้ำ</span>
        </h2>
        <div className="dashboard-stat-grid">
          <StatTile label="ความเสี่ยงต่ำ" value={stats.risk.byLevel.low} tone="good" />
          <StatTile label="ความเสี่ยงปานกลาง" value={stats.risk.byLevel.medium} tone="warning" />
          <StatTile
            label="ความเสี่ยงสูง"
            value={stats.risk.byLevel.high}
            tone={stats.risk.byLevel.high > 0 ? "critical" : "neutral"}
          />
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
