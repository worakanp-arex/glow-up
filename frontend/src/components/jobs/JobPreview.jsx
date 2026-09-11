import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, MapPin, Paperclip, Send, ShieldCheck, Wallet } from "lucide-react";
import * as applicationService from "../../services/applicationService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import StatusBadge from "../common/StatusBadge.jsx";
import "./JobPreview.css";

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function JobPreview({ job }) {
  const { user, isAuthenticated } = useAuth();
  const [applying, setApplying] = useState(false);
  const [justApplied, setJustApplied] = useState(false);
  const [error, setError] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState({});
  const [myApplications, setMyApplications] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || user.role !== "user") return;
    applicationService.getMyApplications().then(setMyApplications);
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    setApplying(false);
    setJustApplied(false);
    setError("");
    setAttachmentFiles({});
  }, [job?._id]);

  if (!job) {
    return <div className="job-preview job-preview-empty">เลือกตำแหน่งงานเพื่อดูรายละเอียด</div>;
  }

  const existingApplication = myApplications.find((app) => app.job?._id === job._id);
  const alreadyApplied = Boolean(existingApplication) || justApplied;
  const attachmentRequests = job.attachmentRequests || [];

  function handleAttachmentChange(name, file) {
    setAttachmentFiles((prev) => ({ ...prev, [name]: file }));
  }

  async function handleApply() {
    setError("");
    if (attachmentRequests.length > 0) {
      const missing = attachmentRequests.filter((name) => !attachmentFiles[name]);
      if (missing.length > 0) {
        setError(`กรุณาแนบไฟล์ให้ครบ: ${missing.join(", ")}`);
        return;
      }
    }
    setApplying(true);
    try {
      const files = attachmentRequests.map((name) => attachmentFiles[name]);
      const application = await applicationService.applyToJob(job._id, files);
      setJustApplied(true);
      setMyApplications((prev) => [{ ...application, job }, ...prev]);
    } catch (err) {
      if (err.response?.status === 409) {
        // Someone else applied from another tab/session in the meantime — refresh
        // the list so the UI settles into the same calm "already applied" state.
        setJustApplied(true);
        applicationService.getMyApplications().then(setMyApplications);
      } else {
        setError(err.response?.data?.message || "สมัครงานไม่สำเร็จ");
      }
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="job-preview">
      <div className="job-preview-banner">
        <div className="job-preview-banner-top" />
        <div className="job-preview-logo">
          {job.employer?.avatarUrl ? (
            <img src={job.employer.avatarUrl} alt="" />
          ) : (
            <span>{initials(job.employer?.companyName || job.employer?.name)}</span>
          )}
        </div>
      </div>

      <div className="job-preview-body">
        <h1 className="job-preview-title">{job.title}</h1>
        <p className="job-preview-company">
          <span>{job.employer?.companyName || job.employer?.name}</span>
          {job.employer?.businessType && (
            <span className="job-preview-business-type">{job.employer.businessType}</span>
          )}
          {job.employer?.verifiedStatus === "verified" && (
            <span className="job-preview-verified-badge">
              <ShieldCheck size={13} />
              นายจ้างยืนยันตัวตนแล้ว
            </span>
          )}
        </p>

        <div className="job-preview-meta">
          {job.category?.name && <span className="job-preview-category">{job.category.name}</span>}
          {job.location && (
            <span>
              <MapPin size={14} />
              {job.location}
            </span>
          )}
          {job.salary && (
            <span>
              <Wallet size={14} />
              {job.salary.toLocaleString()} บาท
            </span>
          )}
        </div>

        {job.skills?.length > 0 && (
          <div className="job-preview-skills">
            {job.skills.map((skill) => (
              <span key={skill._id} className="job-preview-skill-tag">
                {skill.skillName}
              </span>
            ))}
          </div>
        )}

        {job.description && <p className="job-preview-description">{job.description}</p>}

        {job.externalUrl && (
          <a href={job.externalUrl} target="_blank" rel="noreferrer" className="job-preview-external-link">
            <ExternalLink size={16} />
            <span>ดูประกาศต้นฉบับ</span>
          </a>
        )}

        {error && <p className="job-preview-error">{error}</p>}

        {isAuthenticated && user.role === "user" && alreadyApplied && (
          <div className="job-preview-applied-note">
            <CheckCircle2 size={16} />
            <span>คุณสมัครงานนี้ไปแล้ว</span>
            {existingApplication && <StatusBadge status={existingApplication.status} />}
            <Link to="/my-applications">ดูใบสมัครของฉัน</Link>
          </div>
        )}

        {isAuthenticated && user.role === "user" && !alreadyApplied && attachmentRequests.length > 0 && (
          <div className="job-preview-attachments">
            <p className="job-preview-attachments-title">
              <Paperclip size={14} />
              <span>เอกสารเพิ่มเติมที่ต้องแนบ</span>
            </p>
            {attachmentRequests.map((name) => (
              <label key={name} className="job-preview-attachment-field">
                {name}
                <input
                  type="file"
                  onChange={(e) => handleAttachmentChange(name, e.target.files[0])}
                />
              </label>
            ))}
          </div>
        )}

        {isAuthenticated && user.role === "user" && !alreadyApplied && (
          <button
            type="button"
            className="job-preview-apply-button"
            onClick={handleApply}
            disabled={applying}
          >
            <Send size={16} />
            <span>{applying ? "กำลังสมัคร..." : "สมัครงาน"}</span>
          </button>
        )}

        {!isAuthenticated && (
          <p className="job-preview-login-hint">
            <Link to="/login">เข้าสู่ระบบ</Link> เพื่อสมัครงานนี้
          </p>
        )}
      </div>
    </div>
  );
}

export default JobPreview;
