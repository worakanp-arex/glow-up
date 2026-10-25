import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, ClipboardList, HeartPulse, LayoutDashboard, Users } from "lucide-react";
import StatTile from "../../components/common/StatTile.jsx";
import * as adminService from "../../services/adminService.js";
import "./Dashboard.css";

// Every number links to the list that explains it.
function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    adminService
      .getDashboard()
      .then((data) => setStats(Array.isArray(data) ? null : data))
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  const header = <PageHeader art="mascot" icon={LayoutDashboard} eyebrow="Admin" description={<>ภาพรวมผู้ใช้งาน ประกาศงาน ใบสมัคร และความเสี่ยงในระบบทั้งหมด กดที่การ์ดเพื่อดูรายละเอียดของตัวเลขนั้น</>}>แผงควบคุมผู้ดูแลระบบ</PageHeader>;

  if (loadError) return <div className="admin-dashboard-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;
  if (loading) return <div className="admin-dashboard-page">{header}<AsyncState /></div>;
  if (!stats) return <div className="admin-dashboard-page">{header}<AsyncState empty title="ยังไม่มีข้อมูลภาพรวม" /></div>;

  const byStatus = stats.applications.byStatus || {};
  const risk = stats.risk.byLevel;

  return (
    <div className="admin-dashboard-page">
      {header}

      <div className="admin-dashboard-links">
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

      <section className="admin-dashboard-group">
        <h2>
          <Users size={16} />
          <span>ผู้ใช้งาน</span>
        </h2>
        <div className="admin-dashboard-grid">
          <StatTile label="ผู้ใช้งานทั้งหมด" value={stats.users.total} to="/admin/users?role=user" hint="ดูรายชื่อผู้ใช้งาน" />
          <StatTile label="นายจ้างทั้งหมด" value={stats.users.employers} to="/admin/users?role=employer" hint="ดูรายชื่อนายจ้าง" />
          <StatTile
            label="รอการยืนยันบัญชี"
            value={stats.users.pendingVerifications}
            tone={stats.users.pendingVerifications > 0 ? "warning" : "neutral"}
            to="/admin/users?verifiedStatus=pending"
            hint="ดูบัญชีที่รอตรวจสอบ"
          />
        </div>
      </section>

      <section className="admin-dashboard-group">
        <h2>
          <Briefcase size={16} />
          <span>ประกาศงาน</span>
        </h2>
        <div className="admin-dashboard-grid">
          <StatTile label="ประกาศงานทั้งหมด" value={stats.jobs.total} to="/admin/jobs?tab=all" hint="ดูประกาศทั้งหมด" />
          <StatTile
            label="รอยืนยันประกาศงาน"
            value={stats.jobs.pending}
            tone={stats.jobs.pending > 0 ? "warning" : "neutral"}
            to="/admin/jobs?tab=pending"
            hint="ตรวจสอบประกาศที่รออยู่"
          />
          <StatTile label="เปิดรับสมัครอยู่" value={stats.jobs.open} tone="good" to="/admin/jobs?tab=verified" hint="ดูประกาศที่เผยแพร่แล้ว" />
        </div>
      </section>

      <section className="admin-dashboard-group">
        <h2>
          <ClipboardList size={16} />
          <span>ใบสมัครงาน</span>
        </h2>
        <div className="admin-dashboard-grid">
          <StatTile label="ใบสมัครทั้งหมด" value={stats.applications.total} to="/admin/applications" hint="ดูใบสมัครแต่ละใบ" />
          <StatTile label="รอดำเนินการ" value={byStatus.pending ?? 0} to="/admin/applications?status=pending" />
          <StatTile label="นัดสัมภาษณ์" value={byStatus.interview ?? 0} to="/admin/applications?status=interview" />
          <StatTile label="ผ่านการคัดเลือก" value={byStatus.passed ?? 0} tone="good" to="/admin/applications?status=passed" />
          <StatTile label="ถูกปฏิเสธ" value={byStatus.rejected ?? 0} to="/admin/applications?status=rejected" />
        </div>
      </section>

      <section className="admin-dashboard-group">
        <h2>
          <HeartPulse size={16} />
          <span>ความเสี่ยงการเสพซ้ำ</span>
        </h2>
        <div className="admin-dashboard-grid">
          <StatTile label="ความเสี่ยงต่ำ" value={risk.low} tone="good" to="/admin/assessments" hint="ดูผลประเมินความเสี่ยง" />
          <StatTile label="ความเสี่ยงปานกลาง" value={risk.medium} tone="warning" to="/admin/assessments" hint="ดูสรุปผลประเมิน" />
          <StatTile label="ความเสี่ยงสูง" value={risk.high} tone={risk.high > 0 ? "critical" : "neutral"} to="/admin/assessments" hint="ดูสรุปผลประเมิน" />
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
