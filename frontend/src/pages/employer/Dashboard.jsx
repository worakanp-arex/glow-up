import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Building2, ClipboardList, Plus, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatTile from "../../components/common/StatTile.jsx";
import * as jobService from "../../services/jobService.js";
import * as applicationService from "../../services/applicationService.js";
import "./Dashboard.css";

const QUICK_LINKS = [
  { to: "/employer/jobs/new", label: "สร้างประกาศงาน", icon: Plus },
  { to: "/employer/jobs", label: "ประกาศงานของฉัน", icon: Briefcase },
  { to: "/profile", label: "โปรไฟล์บริษัท", icon: Building2 },
];

const RECENT_JOBS_LIMIT = 5;

function Dashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [applicantCounts, setApplicantCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobService
      .getMyJobs()
      .then(async (data) => {
        setJobs(data);
        const entries = await Promise.all(
          data.map((job) =>
            applicationService
              .getJobApplicants(job._id)
              .then((list) => [job._id, list.length])
              .catch(() => [job._id, 0])
          )
        );
        setApplicantCounts(Object.fromEntries(entries));
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="dashboard-page">กำลังโหลด...</div>;
  }

  const openJobsCount = jobs.filter((job) => job.status === "open").length;
  const totalApplicants = Object.values(applicantCounts).reduce((sum, n) => sum + n, 0);
  const recentJobs = jobs.slice(0, RECENT_JOBS_LIMIT);

  return (
    <div className="dashboard-page">
      <div className="dashboard-greeting">
        <h1>
          <Building2 size={22} />
          <span>สวัสดี, {user.companyName || user.name}</span>
        </h1>
        <StatusBadge status={user.verifiedStatus} />
      </div>
      <p className="dashboard-subtitle">ภาพรวมประกาศงานและผู้สมัครของบริษัทคุณ</p>

      <div className="dashboard-links">
        {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}
      </div>

      <div className="dashboard-stat-grid">
        <StatTile
          label="ประกาศงานที่เปิดรับ"
          value={openJobsCount}
          tone={openJobsCount > 0 ? "good" : "neutral"}
        />
        <StatTile label="ประกาศงานทั้งหมด" value={jobs.length} />
        <StatTile
          label="ผู้สมัครทั้งหมด"
          value={totalApplicants}
          tone={totalApplicants > 0 ? "good" : "neutral"}
        />
      </div>

      <div className="dashboard-recent">
        <h2>
          <ClipboardList size={18} />
          <span>ประกาศงานล่าสุด</span>
        </h2>

        {jobs.length === 0 ? (
          <p className="dashboard-empty">ยังไม่มีประกาศงาน ลองสร้างประกาศแรกของคุณจากปุ่ม &quot;สร้างประกาศงาน&quot; ด้านบน</p>
        ) : (
          <>
            <ul className="dashboard-job-list">
              {recentJobs.map((job) => (
                <li key={job._id}>
                  <div className="dashboard-job-info">
                    <p className="dashboard-job-title">{job.title}</p>
                    <div className="dashboard-job-badges">
                      <StatusBadge status={job.status} />
                      <StatusBadge status={job.verifiedStatus} />
                    </div>
                  </div>
                  <Link to={`/employer/jobs/${job._id}/applicants`} className="dashboard-job-applicants">
                    <Users size={14} />
                    <span>{applicantCounts[job._id] ?? 0} ผู้สมัคร</span>
                  </Link>
                </li>
              ))}
            </ul>
            {jobs.length > recentJobs.length && (
              <Link to="/employer/jobs" className="dashboard-view-all">
                ดูประกาศงานทั้งหมด &rarr;
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
