import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Building2, CalendarDays } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import * as applicationService from "../../services/applicationService.js";
import "./MyApplications.css";

const CANCELLABLE_STATUSES = ["pending", "interview"];

// Placeholder until real AI job matching ships (see README roadmap) — deterministic
// per application so the number doesn't jump around on every reload.
function matchScoreFor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return 72 + (hash % 27);
}

function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    applicationService
      .getMyApplications()
      .then(setApplications)
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

  if (loading) {
    return <div className="my-applications-page">กำลังโหลด...</div>;
  }

  return (
    <div className="my-applications-page">
      <h1>
        <Briefcase size={22} />
        <span>ใบสมัครของฉัน</span>
      </h1>

      {applications.length === 0 && <p className="my-applications-empty">คุณยังไม่ได้สมัครงานใด</p>}

      <ul className="my-applications-list">
        {applications.map((app) => {
          const employerName = app.job?.employer?.companyName || app.job?.employer?.name;
          const note = app.employerFeedback || app.rejectionReason;

          return (
            <li key={app._id}>
              <div className="app-card-main">
                <div className="app-card-info">
                  <Link to={`/jobs/${app.job._id}`} className="app-card-title">
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
                    <span className="app-card-match-label">คะแนนแมตช์</span>
                    <span className="app-card-match-score">{matchScoreFor(app._id)}%</span>
                  </div>
                  <StatusBadge status={app.status} />
                  <Link to={`/jobs/${app.job._id}`} className="app-card-detail-btn">
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
    </div>
  );
}

export default MyApplications;
