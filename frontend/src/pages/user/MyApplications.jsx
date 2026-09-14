import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { usePagination } from "../../hooks/usePagination.js";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Building2, CalendarDays } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import * as applicationService from "../../services/applicationService.js";
import "./MyApplications.css";

const CANCELLABLE_STATUSES = ["pending", "interview"];

function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const pagination = usePagination(applications.filter((app) => app.job));

  useEffect(() => {
    applicationService
      .getMyApplications()
      .then(setApplications)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  async function handleCancel(id) {
    if (!window.confirm("ยกเลิกใบสมัครนี้?")) return;
    setCancellingId(id);
    try {
      const updated = await applicationService.cancelApplication(id);
      setApplications((prev) => prev.map((app) => (app._id === id ? { ...app, status: updated.status } : app)));
    } finally {
      setCancellingId(null);
    }
  }

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="my-applications-page"><AsyncState /></div>;
  }

  const visibleApplications = applications.filter((app) => app.job);

  return (
    <div className="my-applications-page">
      <PageHeader icon={Briefcase}>ใบสมัครของฉัน</PageHeader>

      {visibleApplications.length === 0 && <p className="my-applications-empty">คุณยังไม่ได้สมัครงานใด</p>}

      <ul className="my-applications-list">
        {pagination.items.map((app) => {
          const employerName = app.job?.employer?.companyName || app.job?.employer?.name;
          const note = app.employerFeedback || app.rejectionReason;

          return (
            <li key={app._id}>
              <div className="app-card-main">
                <div className="app-card-info">
                  <Link to={`/jobs/${app.job._id}?from=my-applications`} className="app-card-title">
                    {app.job.title}
                  </Link>
                  {employerName && (
                    <p className="app-card-employer">
                      <Building2 size={13} />
                      {employerName}
                    </p>
                  )}
                  <p className="app-card-meta">
                    <CalendarDays size={13} />
                    สมัครเมื่อ {new Date(app.appliedAt).toLocaleDateString("th-TH")}
                  </p>
                </div>

                <div className="app-card-side">
                  <div className="app-card-match">
                    <span className="app-card-match-label">ทักษะตรงกับงาน</span>
                    <span className="app-card-match-score">{app.match ? app.match.score + "%" : "ยังไม่ระบุ"}</span>
                    {app.match && <div className="app-match-breakdown">
                      <strong>{app.match.matchedSkills.length} / {app.match.totalSkills} แต้มทักษะ</strong>
                      <small>ตรง 1 ทักษะ = 1 แต้ม · แยกจากคะแนนภารกิจ</small>
                      <div className="app-match-tags">{app.match.matchedSkills.map(skill => <span key={skill} className="matched">✓ {skill} · 1 แต้ม</span>)}</div>
                      {app.match.matchedSkills.length === 0 && <Link to="/profile">เพิ่มทักษะในโปรไฟล์</Link>}
                      {app.match.missingSkills?.length > 0 && <p>ทักษะที่ยังไม่ตรง: {app.match.missingSkills.join(", ")}</p>}
                    </div>}
                  </div>
                  <StatusBadge status={app.status} />
                  <Link to={`/jobs/${app.job._id}?from=my-applications`} className="app-card-detail-btn">
                    ดูรายละเอียดงาน
                  </Link>
                </div>
              </div>

              {note && (
                <p className="app-card-note">
                  <strong>หมายเหตุจากนายจ้าง:</strong> {note}
                </p>
              )}

              {CANCELLABLE_STATUSES.includes(app.status) && (
                <button
                  type="button"
                  className="my-applications-cancel"
                  onClick={() => handleCancel(app._id)}
                  disabled={cancellingId === app._id}
                >
                  {cancellingId === app._id ? "กำลังยกเลิก..." : "ยกเลิกใบสมัคร"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <Pagination {...pagination} />
    </div>
  );
}

export default MyApplications;
