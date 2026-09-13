import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { UserRound, Award, Briefcase, FileText, GraduationCap, Mail, Paperclip, Phone, ShieldAlert, Sparkles } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import * as applicationService from "../../services/applicationService.js";
import "./ApplicantDetail.css";

const STATUS_OPTIONS = ["pending", "interview", "passed", "rejected"];
const STATUS_LABELS = {
  pending: "รอดำเนินการ",
  interview: "นัดสัมภาษณ์",
  passed: "ผ่านการคัดเลือก",
  rejected: "ปฏิเสธ",
};

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function ApplicantDetail() {
  const { id } = useParams();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState("pending");
  const [employerFeedback, setEmployerFeedback] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    applicationService
      .getApplication(id)
      .then((data) => {
        setApplication(data);
        setStatus(data.status);
        setEmployerFeedback(data.employerFeedback || "");
        setRejectionReason(data.rejectionReason || "");
      })
      .catch((err) => {
        if (err.response?.status === 403) {
          setBlocked(true);
        } else setLoadError(err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const updated = await applicationService.updateApplicationStatus(id, {
        status,
        employerFeedback,
        rejectionReason,
      });
      setApplication(updated);
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const pageHeader = <PageHeader icon={UserRound} backTo={application?.job?._id ? `/employer/jobs/${application.job._id}/applicants` : "/employer/jobs"} backLabel="รายชื่อผู้สมัครงาน">{"รายละเอียดผู้สมัครงาน"}</PageHeader>;

  if (loadError) return <div className="applicant-detail-page">{pageHeader}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) {
    return <div className="applicant-detail-page">{pageHeader}<AsyncState /></div>;
  }
  if (blocked) {
    return (
      <div className="applicant-detail-page">
      {pageHeader}
        <div className="applicant-detail-verification-pending">
          <ShieldAlert size={28} />
          <p>บัญชีนายจ้างของคุณยังไม่ได้รับการยืนยันตัวตน</p>
          <p>กรุณารอการตรวจสอบจากผู้ดูแลระบบก่อนจึงจะดูรายละเอียดผู้สมัครงานนี้ได้</p>
        </div>
      </div>
    );
  }
  if (!application) {
    return <div className="applicant-detail-page">{pageHeader}ไม่พบใบสมัครนี้</div>;
  }

  return (
    <div className="applicant-detail-page">
      {pageHeader}
      <div className="applicant-detail-banner">
        <div className="applicant-detail-banner-top" />
        <div className="applicant-detail-banner-body">
          <span className="applicant-detail-avatar">
            {application.user.avatarUrl ? (
              <img src={application.user.avatarUrl} alt="" />
            ) : (
              initials(application.user.name)
            )}
          </span>
          <div className="applicant-detail-banner-text">
            <h2 className="page-context-title">{application.user.name}</h2>
            <p className="applicant-detail-job">
              <Briefcase size={14} />
              สมัครตำแหน่ง: {application.job.title}
            </p>
          </div>
          <StatusBadge status={application.status} />
        </div>
      </div>

      <div className="applicant-detail-info">
        <p>
          <Mail size={14} />
          {application.user.email}
        </p>
        {application.user.phone && (
          <p>
            <Phone size={14} />
            {application.user.phone}
          </p>
        )}
        <p>
          สถานะยืนยันตัวตน: <StatusBadge status={application.user.verifiedStatus} />
        </p>
        <p className="applicant-detail-match-note">
          <Sparkles size={13} />
          คะแนนจับคู่ AI: จะเปิดใช้งานในเฟสถัดไป
        </p>
      </div>

      {(application.user.education || application.user.experience) && (
        <div className="applicant-detail-info applicant-detail-profile">
          {application.user.education && (
            <p>
              <GraduationCap size={14} />
              <span>{application.user.education}</span>
            </p>
          )}
          {application.user.experience && (
            <p>
              <Briefcase size={14} />
              <span>{application.user.experience}</span>
            </p>
          )}
        </div>
      )}

      {(application.user.resumeUrl || application.user.certificates?.length > 0) && (
        <div className="applicant-detail-info applicant-detail-attachments">
          <p className="applicant-detail-attachments-title">
            <FileText size={16} />
            <span>เรซูเม่และใบรับรอง</span>
          </p>
          <ul>
            {application.user.resumeUrl && (
              <li>
                <a href={application.user.resumeUrl} target="_blank" rel="noreferrer">
                  เรซูเม่
                </a>
              </li>
            )}
            {application.user.certificates?.map((cert, i) => (
              <li key={i}>
                <a href={cert.url} target="_blank" rel="noreferrer">
                  <Award size={13} />
                  {cert.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {application.attachments?.length > 0 && (
        <div className="applicant-detail-info applicant-detail-attachments">
          <p className="applicant-detail-attachments-title">
            <Paperclip size={16} />
            <span>เอกสารที่แนบมาด้วย</span>
          </p>
          <ul>
            {application.attachments.map((file, i) => (
              <li key={i}>
                <a href={file.url} target="_blank" rel="noreferrer">
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {application.status === "cancelled" ? (
        <div className="applicant-detail-info">
          <p>
            สถานะใบสมัคร: <StatusBadge status={application.status} />
          </p>
          <p className="applicant-detail-match-note">ผู้สมัครยกเลิกใบสมัครนี้แล้ว ไม่สามารถเปลี่ยนสถานะได้</p>
        </div>
      ) : (
        <form className="applicant-detail-form" onSubmit={handleSubmit}>
          {error && <p className="applicant-detail-error">{error}</p>}

          <label>
            สถานะใบสมัคร
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {STATUS_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          <label>
            ข้อเสนอแนะถึงผู้สมัคร
            <textarea
              value={employerFeedback}
              onChange={(e) => setEmployerFeedback(e.target.value)}
              rows={3}
            />
          </label>

          {status === "rejected" && (
            <label>
              เหตุผลที่ปฏิเสธ
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
              />
            </label>
          )}

          <button type="submit" className="btn btn-primary applicant-detail-submit" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </form>
      )}
    </div>
  );
}

export default ApplicantDetail;
