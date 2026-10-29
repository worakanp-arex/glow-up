import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Briefcase, Check, Clock, ExternalLink, MapPin, Paperclip, Plus, Send, ShieldCheck } from "lucide-react";
import * as applicationService from "../../services/applicationService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import StatusBadge from "../common/StatusBadge.jsx";
import { initials } from "../../utils/initials.js";
import { splitDescription } from "../../utils/jobDescription.js";
import "./JobPreview.css";

// หัวข้อที่แสดงใต้ "เกี่ยวกับงานนี้" เรียงตามลำดับที่ผู้สมัครอยากอ่าน
const DESCRIPTION_SECTIONS = [
  ["duties", "หน้าที่หลัก"],
  ["requirements", "คุณสมบัติและสิ่งที่ต้องทำได้"],
  ["benefits", "สวัสดิการและเงื่อนไข"],
];

function JobPreview({ job, showTitle = true, saved = false, onToggleSave, match = null, showImage = true }) {
  const { user, isAuthenticated } = useAuth();
  const [applying, setApplying] = useState(false);
  const [justApplied, setJustApplied] = useState(null);
  const [error, setError] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState({});
  const [myApplications, setMyApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(isAuthenticated && user?.role === "user");
  const [applicationsError, setApplicationsError] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user.role !== "user") return;
    applicationService.getMyApplications().then(setMyApplications).catch(() => setApplicationsError(true)).finally(() => setApplicationsLoading(false));
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    setApplying(false);
    setJustApplied(null);
    setError("");
    setAttachmentFiles({});
  }, [job?._id]);

  if (!job) {
    return <div className="job-preview job-preview-empty">เลือกตำแหน่งงานเพื่อดูรายละเอียด</div>;
  }

  const isSeeker = isAuthenticated && user.role === "user";
  const companyName = job.employer?.companyName || job.employer?.name;
  const existingApplication = myApplications.find((app) => app.job?._id === job._id);
  const alreadyApplied = Boolean(existingApplication) || justApplied === job._id;
  const attachmentRequests = job.attachmentRequests || [];
  const expired = job.status === "expired" || (job.expiredAt && new Date(job.expiredAt) <= new Date());
  const accepting = job.status === "open" && job.verifiedStatus === "verified" && !expired;
  const applicationStatus = existingApplication?.status || "pending";
  const statusMessages = { pending: "ส่งใบสมัครแล้ว · รอนายจ้างพิจารณา", interview: "ได้รับนัดสัมภาษณ์ · ดูรายละเอียดในใบสมัคร", passed: "ผ่านการคัดเลือกแล้ว", rejected: "ใบสมัครไม่ได้รับการคัดเลือก", cancelled: "คุณยกเลิกใบสมัครนี้แล้ว" };
  const sections = splitDescription(job.description);
  const seekerVerified = user?.verifiedStatus === "verified";
  const canApply = isSeeker && seekerVerified && !alreadyApplied && accepting;

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
      setJustApplied(job._id);
      setMyApplications((prev) => [{ ...application, job }, ...prev]);
    } catch (err) {
      if (err.response?.status === 409) {
        // ระหว่างนั้นมีคนสมัครจากแท็บ/เซสชันอื่น — รีเฟรช
        // รายการเพื่อให้ UI เข้าสู่สถานะ "สมัครแล้ว" แบบสงบเหมือนกัน
        setJustApplied(job._id);
        applicationService.getMyApplications().then(setMyApplications).catch(() => setApplicationsError(true));
      } else {
        setError(err.response?.data?.message || "สมัครงานไม่สำเร็จ");
      }
    } finally {
      setApplying(false);
    }
  }

  return (
    <article className="job-preview">
      {showImage && job.imageUrl && <img className="job-preview-image" src={job.imageUrl} alt={`รูปประกาศงาน ${job.title}`} loading="lazy" />}
      <div className="job-preview-top">
        <span className="job-preview-logo" aria-hidden="true">
          {job.employer?.avatarUrl ? <img src={job.employer.avatarUrl} alt="" /> : initials(companyName)}
        </span>
        {isSeeker && onToggleSave && (
          <button
            type="button"
            className={`job-save-btn${saved ? " is-saved" : ""}`}
            onClick={() => onToggleSave(job._id)}
            aria-pressed={saved}
            aria-label={saved ? "เลิกบันทึกงานนี้" : "บันทึกงานนี้"}
          >
            <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      {showTitle && <h2 className="job-preview-title">{job.title}</h2>}
      <p className="job-preview-company">
        <span>{companyName}</span>
        {job.employer?.verifiedStatus === "verified" && (
          <span className="job-preview-verified-badge"><ShieldCheck size={13} />ยืนยันตัวตนแล้ว</span>
        )}
      </p>

      <div className="job-preview-meta">
        {job.location && <span><MapPin size={14} aria-hidden="true" />{job.location}</span>}
        {job.category?.name && <span><Briefcase size={14} aria-hidden="true" />{job.category.name}</span>}
        {job.employer?.businessType && <span>{job.employer.businessType}</span>}
      </div>

      {job.salary > 0 && <p className="job-preview-salary">{job.salary.toLocaleString()} <small>บาท/เดือน</small></p>}

      {isSeeker && match && (
        <section className="job-match" aria-label="ความตรงกันของทักษะ">
          <div className="job-match-head">
            <strong>ทักษะของคุณตรง {match.score}%</strong>
            <span>{match.matched.length} จาก {match.total} ทักษะ</span>
          </div>
          <div className="ui-progress"><span style={{ width: `${match.score}%` }} /></div>
          <div className="job-match-chips">
            {match.matched.map((skill) => <span key={skill._id} className="is-have"><Check size={12} aria-hidden="true" />{skill.skillName}</span>)}
            {match.missing.map((skill) => <span key={skill._id}><Plus size={12} aria-hidden="true" />{skill.skillName}</span>)}
          </div>
          <p className="job-match-note">
            เทียบจากทักษะในโปรไฟล์ ไม่ใช่โอกาสได้รับการจ้างงาน · <Link to="/profile?tab=skills">แก้ไขทักษะ</Link>
          </p>
        </section>
      )}

      {!isSeeker && job.skills?.length > 0 && (
        <section className="job-preview-section">
          <h3>ทักษะที่ต้องการ</h3>
          <div className="job-match-chips">
            {job.skills.map((skill) => <span key={skill._id}>{skill.skillName}</span>)}
          </div>
        </section>
      )}

      {sections.about.length > 0 && (
        <section className="job-preview-section">
          <h3>เกี่ยวกับงานนี้</h3>
          {sections.about.map((line, i) => <p key={i}>{line}</p>)}
        </section>
      )}

      {DESCRIPTION_SECTIONS.map(([key, title]) => sections[key].length > 0 && (
        <section key={key} className="job-preview-section">
          <h3>{title}</h3>
          <ul>{sections[key].map((line, i) => <li key={i}>{line}</li>)}</ul>
        </section>
      ))}

      {attachmentRequests.length > 0 && (
        <section className="job-preview-section">
          <h3>เอกสารที่ต้องเตรียม</h3>
          <div className="job-match-chips">
            {attachmentRequests.map((name) => <span key={name}><Paperclip size={12} aria-hidden="true" />{name}</span>)}
          </div>
        </section>
      )}

      {job.externalUrl && (
        <a href={job.externalUrl} target="_blank" rel="noreferrer" className="job-preview-external-link">
          <ExternalLink size={15} />
          <span>ดูประกาศต้นฉบับ</span>
        </a>
      )}

      {error && <p className="job-preview-error">{error}</p>}

      {isSeeker && alreadyApplied && (
        <div className={`job-preview-applied-note application-tone-${applicationStatus}`}>
          <span>{statusMessages[applicationStatus] || "ส่งใบสมัครแล้ว"}</span>
          {existingApplication && <StatusBadge status={existingApplication.status} />}
          <Link to="/my-applications">ดูใบสมัครของฉัน</Link>
        </div>
      )}

      {!accepting && <p className="job-availability-note"><Clock size={16} />{expired ? "หมดเขตรับสมัครแล้ว" : job.status === "closed" ? "ตำแหน่งนี้ปิดรับสมัครแล้ว" : "ประกาศนี้ยังไม่เปิดรับสมัคร"}</p>}
      {isSeeker && !seekerVerified && accepting && !alreadyApplied && (
        <p className="job-availability-note"><ShieldCheck size={16} />บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบยืนยัน จึงยังสมัครงานไม่ได้ (ดูและบันทึกงานได้ตามปกติ)</p>
      )}
      {applicationsError && <p className="job-preview-error" role="alert">ตรวจสอบใบสมัครไม่สำเร็จ กรุณาโหลดหน้าใหม่ก่อนสมัคร</p>}

      {canApply && attachmentRequests.length > 0 && (
        <div className="job-preview-attachments">
          <p className="job-preview-attachments-title">
            <Paperclip size={14} />
            <span>แนบเอกสารก่อนสมัคร</span>
          </p>
          {attachmentRequests.map((name) => (
            <label key={name} className="job-preview-attachment-field">
              {name}
              <input type="file" onChange={(e) => handleAttachmentChange(name, e.target.files[0])} />
            </label>
          ))}
        </div>
      )}

      {/* ผู้เยี่ยมชมเห็นปุ่มเข้าสู่ระบบเฉพาะงานที่ยังรับสมัคร งานที่ปิด/หมดเขตมีข้อความแจ้งด้านบนอยู่แล้ว */}
      {(canApply || (!isAuthenticated && accepting)) && (
        <footer className="job-preview-foot">
          {job.salary > 0 ? (
            <div className="job-preview-foot-salary"><small>เงินเดือน</small><strong>{job.salary.toLocaleString()} <span>บาท/เดือน</span></strong></div>
          ) : <span />}
          {canApply ? (
            <button
              type="button"
              className="ui-btn ui-btn-primary job-preview-apply-button"
              onClick={handleApply}
              disabled={applying || applicationsLoading || applicationsError}
            >
              <Send size={16} />
              <span>{applicationsLoading ? "ตรวจสอบใบสมัคร..." : applying ? "กำลังสมัคร..." : "สมัครงาน"}</span>
            </button>
          ) : (
            <p className="job-preview-login-hint">
              <Link to="/login">เข้าสู่ระบบ</Link> เพื่อสมัครงานนี้
            </p>
          )}
        </footer>
      )}
    </article>
  );
}

export default JobPreview;
