import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Building2, ChevronRight, ClipboardList, Plus, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatTile from "../../components/common/StatTile.jsx";
import VerifyBanner from "../../components/employer/VerifyBanner.jsx";
import * as jobService from "../../services/jobService.js";
import "./Dashboard.css";

const QUICK_LINKS = [
  { to: "/employer/jobs/new", label: "สร้างประกาศงาน", icon: Plus },
  { to: "/employer/jobs", label: "ประกาศงานของฉัน", icon: Briefcase },
  { to: "/employer/applications", label: "ผู้สมัครทั้งหมด", icon: Users },
  { to: "/profile", label: "โปรไฟล์บริษัท", icon: Building2 },
];

const RECENT_JOBS_LIMIT = 5;

function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    Promise.all([
      jobService.getMyJobsSummary(),
      jobService.getMyJobsPage({ page: 1, limit: RECENT_JOBS_LIMIT }),
    ])
      .then(([summaryData, jobsPage]) => {
        setSummary(summaryData && !Array.isArray(summaryData) ? summaryData : null);
        setRecent(jobsPage.items);
      })
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  const header = (
    <PageHeader icon={Building2} eyebrow="Employer space" description="ภาพรวมประกาศงานและผู้สมัครของบริษัทคุณ กดที่การ์ดเพื่อดูรายละเอียด" actions={<StatusBadge status={user.verifiedStatus} />}>
      สวัสดี, {user.companyName || user.name}
    </PageHeader>
  );

  if (loadError) return <div className="employer-dashboard-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;
  if (loading) return <div className="employer-dashboard-page">{header}<AsyncState /></div>;

  const jobs = summary?.jobs || {};
  const applicants = summary?.applicants || {};

  return (
    <div className="employer-dashboard-page">
      {header}
      <VerifyBanner />

      <div className="employer-dashboard-stats">
        <StatTile label="ประกาศงานที่เปิดรับ" value={jobs.open ?? 0} tone={jobs.open > 0 ? "good" : "neutral"} to="/employer/jobs?filter=open" />
        <StatTile label="ประกาศงานทั้งหมด" value={jobs.total ?? recent.length} to="/employer/jobs" />
        <StatTile label="รอผู้ดูแลระบบตรวจสอบ" value={jobs.pending ?? 0} tone={jobs.pending > 0 ? "warning" : "neutral"} to="/employer/jobs?filter=pending" />
        <StatTile label="ผู้สมัครทั้งหมด" value={applicants.total ?? 0} tone={applicants.total > 0 ? "good" : "neutral"} to="/employer/applications" />
        <StatTile label="ผู้สมัครที่รอพิจารณา" value={applicants.pending ?? 0} tone={applicants.pending > 0 ? "warning" : "neutral"} to="/employer/applications?status=pending" />
      </div>

      <div className="employer-dashboard-grid">
        <section className="ui-card employer-dashboard-recent">
          <div className="ui-card-head">
            <h2><ClipboardList size={18} aria-hidden="true" /> ประกาศงานล่าสุด</h2>
            <Link to="/employer/jobs" className="ui-card-link">ดูทั้งหมด</Link>
          </div>

          {recent.length === 0 ? (
            <p className="employer-dashboard-empty">ยังไม่มีประกาศงาน ลองสร้างประกาศแรกของคุณจากปุ่ม &quot;สร้างประกาศงาน&quot;</p>
          ) : (
            <ul className="employer-dashboard-job-list">
              {recent.map((job) => (
                <li key={job._id}>
                  <Link to={`/employer/jobs/${job._id}`} className="employer-dashboard-job">
                    <span className="employer-dashboard-job-info">
                      <span className="employer-dashboard-job-title">{job.title}</span>
                      <span className="employer-dashboard-job-badges">
                        <StatusBadge status={job.status} />
                        <StatusBadge status={job.verifiedStatus} />
                      </span>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="ui-card employer-dashboard-links">
          <div className="ui-card-head"><h2>ทางลัด</h2></div>
          {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}>
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}

export default Dashboard;
