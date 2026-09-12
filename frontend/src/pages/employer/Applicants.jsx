import Pagination from "../../components/common/Pagination.jsx";
import { usePagination } from "../../hooks/usePagination.js";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Paperclip, ShieldAlert, Users } from "lucide-react";
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
  const pagination = usePagination(applicants);
  const [loadError, setLoadError] = useState(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    applicationService
      .getJobApplicants(jobId)
      .then(setApplicants)
      .catch((err) => {
        if (err.response?.status === 403) {
          setBlocked(true);
        }
      })
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="applicants-page"><AsyncState /></div>;
  }

  if (blocked) {
    return (
      <div className="applicants-page">
        <Link to="/employer/jobs" className="applicants-back">
          <ArrowLeft size={16} />
          กลับไปประกาศงานของฉัน
        </Link>
        <div className="applicants-verification-pending">
          <ShieldAlert size={28} />
          <p>บัญชีนายจ้างของคุณยังไม่ได้รับการยืนยันตัวตน</p>
          <p>กรุณารอการตรวจสอบจากผู้ดูแลระบบก่อนจึงจะดูรายชื่อผู้สมัครงานได้</p>
        </div>
      </div>
    );
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
        {pagination.items.map((app) => (
          <li key={app._id}>
            <Link to={`/employer/applications/${app._id}`} className="applicants-info">
              <span className="applicants-avatar">
                {app.user.avatarUrl ? (
                  <img src={app.user.avatarUrl} alt="" />
                ) : (
                  initials(app.user.name)
                )}
              </span>
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
      <Pagination {...pagination} />
    </div>
  );
}

export default Applicants;
