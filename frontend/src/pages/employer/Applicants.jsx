import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Paperclip, Users } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import * as applicationService from "../../services/applicationService.js";
import "./Applicants.css";

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function Applicants() {
  const { jobId } = useParams();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applicationService
      .getJobApplicants(jobId)
      .then(setApplicants)
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) {
    return <div className="applicants-page">กำลังโหลด...</div>;
  }

  return (
    <div className="applicants-page">
      <Link to="/employer/jobs" className="applicants-back">
        <ArrowLeft size={16} />
        กลับไปประกาศงานของฉัน
      </Link>

      <h1>
        <Users size={22} />
        <span>ผู้สมัครงาน</span>
      </h1>

      {applicants.length === 0 && <p className="applicants-empty">ยังไม่มีผู้สมัครสำหรับงานนี้</p>}

      <ul className="applicants-list">
        {applicants.map((app) => (
          <li key={app._id}>
            <Link to={`/employer/applications/${app._id}`} className="applicants-info">
              <span className="applicants-avatar">{initials(app.user.name)}</span>
              <span className="applicants-text">
                <span className="applicants-name">{app.user.name}</span>
                <span className="applicants-verified">
                  ยืนยันตัวตน: <StatusBadge status={app.user.verifiedStatus} />
                </span>
                {app.attachments?.length > 0 && (
                  <span className="applicants-attachment-count">
                    <Paperclip size={13} />
                    {app.attachments.length} ไฟล์แนบ
                  </span>
                )}
              </span>
            </Link>
            <StatusBadge status={app.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Applicants;
