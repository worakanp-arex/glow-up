import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { usePagination } from "../../hooks/usePagination.js";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Paperclip, ShieldAlert, Users } from "lucide-react";
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
        } else setLoadError(err);
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  const pageHeader = <PageHeader icon={Users} backTo={"/employer/jobs"} backLabel="ประกาศงานของฉัน">{"ผู้สมัครงาน"}</PageHeader>;

  if (loadError) return <div className="applicants-page">{pageHeader}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) {
    return <div className="applicants-page">{pageHeader}<AsyncState /></div>;
  }

  if (blocked) {
    return (
      <div className="applicants-page">
      {pageHeader}
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
      {pageHeader}


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
