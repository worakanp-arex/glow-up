import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import JobPreview from "../../components/jobs/JobPreview.jsx";
import ApplicantRow from "../../components/employer/ApplicantRow.jsx";
import VerifyBanner from "../../components/employer/VerifyBanner.jsx";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Briefcase, CalendarDays, Download, FileText, MapPin, Pencil, ShieldAlert, Tag, Users, Wallet } from "lucide-react";
import * as jobService from "../../services/jobService.js";
import * as applicationService from "../../services/applicationService.js";
import { formatCourseDate } from "../../utils/courseDates.js";
import "./JobDetail.css";

const TABS = [
  { key: "details", label: "รายละเอียด" },
  { key: "applicants", label: "ผู้สมัคร" },
  { key: "files", label: "ไฟล์ที่ได้รับ" },
];

// มุมมองของนายจ้างเองต่อประกาศหนึ่งรายการ: ทุกอย่างเกี่ยวกับประกาศนั้น ใครสมัคร
// และไฟล์ที่ส่งมา — ไม่ว่าจะอยู่ในสถานะการตรวจสอบใด
function JobDetail() {
  const { jobId } = useParams();
  // คำเตือนที่หน้าแก้ไขส่งมา (เช่น บันทึกประกาศได้แต่รูปไม่สำเร็จ)
  const notice = useLocation().state?.notice;
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab = TABS.some((item) => item.key === requested) ? requested : "details";
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [applicants, setApplicants] = useState(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    jobService
      .getMyJob(jobId)
      .then((data) => setJob(Array.isArray(data) ? null : data))
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, [jobId]);

  // ต้องใช้ผู้สมัครสำหรับตัวเลขในแท็บด้วย และสำหรับสองแท็บที่แสดงรายชื่อ
  useEffect(() => {
    applicationService
      .getJobApplicants(jobId)
      .then((data) => setApplicants(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err.response?.status === 403) setBlocked(true);
        setApplicants([]);
      });
  }, [jobId]);

  const header = (
    <PageHeader
      icon={Briefcase}
      eyebrow="Employer space"
      backTo="/employer/jobs"
      backLabel="ประกาศงานของฉัน"
      actions={job && (
        <>
          <Link to={`/employer/jobs/${job._id}/applicants`} className="ui-btn ui-btn-outline"><Users size={15} aria-hidden="true" />หน้าผู้สมัคร</Link>
          <Link to={`/employer/jobs/${job._id}/edit`} className="ui-btn ui-btn-primary"><Pencil size={15} aria-hidden="true" />แก้ไขประกาศ</Link>
        </>
      )}
    >{job?.title || "รายละเอียดประกาศงาน"}</PageHeader>
  );

  if (loadError) return <div className="employer-job-detail-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;
  if (loading) return <div className="employer-job-detail-page">{header}<AsyncState /></div>;
  if (!job) return <div className="employer-job-detail-page">{header}<AsyncState empty title="ไม่พบประกาศงานนี้" /></div>;

  const files = (applicants || []).flatMap((application) =>
    (application.attachments || []).map((file, index) => ({ key: `${application._id}-${index}`, file, application }))
  );

  return (
    <div className="employer-job-detail-page">
      {header}
      <VerifyBanner />
      {notice && <p className="employer-job-notice" role="alert">{notice}</p>}

      <div className="employer-job-status">
        <StatusBadge status={job.status} />
        <StatusBadge status={job.verifiedStatus} />
        {job.expiredAt && <span className="ui-chip ui-chip-neutral"><CalendarDays size={12} aria-hidden="true" />หมดอายุ {formatCourseDate(job.expiredAt)}</span>}
      </div>

      {job.verifiedStatus === "rejected" && (
        <div className="employer-banner is-danger" role="note">
          <ShieldAlert size={20} aria-hidden="true" />
          <div>
            <strong>ประกาศนี้ไม่ผ่านการตรวจสอบ</strong>
            <p>{job.rejectionReason ? `เหตุผล: ${job.rejectionReason}` : "ผู้ดูแลระบบไม่ได้ระบุเหตุผล"} — แก้ไขประกาศแล้วบันทึกเพื่อส่งตรวจสอบอีกครั้ง</p>
          </div>
        </div>
      )}

      <div className="ui-tabs" role="tablist" aria-label="ส่วนของประกาศงาน">
        {TABS.map((item) => (
          <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className="ui-tab" onClick={() => setSearchParams(item.key === "details" ? {} : { tab: item.key })}>
            {item.label}
            {item.key === "applicants" && applicants && ` (${applicants.length})`}
            {item.key === "files" && applicants && ` (${files.length})`}
          </button>
        ))}
      </div>

      {tab === "details" && (
        <div className="employer-job-detail-grid">
          <div className="ui-card employer-job-preview">
            <JobPreview job={job} showTitle={false} />
          </div>
          <aside className="ui-card employer-job-facts">
            <div className="ui-card-head"><h2>ข้อมูลประกาศ</h2></div>
            <dl>
              <div><dt><Tag size={14} aria-hidden="true" />ประเภทงาน</dt><dd>{job.category?.name || "ไม่ระบุ"}</dd></div>
              <div><dt><MapPin size={14} aria-hidden="true" />สถานที่</dt><dd>{job.location || "ไม่ระบุ"}</dd></div>
              <div><dt><Wallet size={14} aria-hidden="true" />เงินเดือน</dt><dd>{job.salary ? `${job.salary.toLocaleString()} บาท` : "ไม่ระบุ"}</dd></div>
              <div><dt><CalendarDays size={14} aria-hidden="true" />สร้างเมื่อ</dt><dd>{formatCourseDate(job.createdAt) || "-"}</dd></div>
              <div><dt><CalendarDays size={14} aria-hidden="true" />หมดอายุ</dt><dd>{job.expiredAt ? formatCourseDate(job.expiredAt) : "ไม่กำหนด"}</dd></div>
              <div><dt><Users size={14} aria-hidden="true" />ผู้สมัคร</dt><dd>{blocked ? "รอยืนยันบัญชี" : applicants ? `${applicants.length} คน` : "..."}</dd></div>
            </dl>
          </aside>
        </div>
      )}

      {tab === "applicants" && (
        blocked ? (
          <AsyncState empty title="ยังดูผู้สมัครไม่ได้" description="บัญชีนายจ้างของคุณยังไม่ได้รับการยืนยันตัวตน" />
        ) : !applicants ? <AsyncState /> : applicants.length === 0 ? (
          <p className="employer-job-empty">ยังไม่มีผู้สมัครสำหรับงานนี้</p>
        ) : (
          <ul className="employer-job-applicants">
            {applicants.map((application) => <ApplicantRow key={application._id} application={application} />)}
          </ul>
        )
      )}

      {tab === "files" && (
        blocked ? (
          <AsyncState empty title="ยังดูไฟล์ไม่ได้" description="บัญชีนายจ้างของคุณยังไม่ได้รับการยืนยันตัวตน" />
        ) : !applicants ? <AsyncState /> : files.length === 0 ? (
          <p className="employer-job-empty">ยังไม่มีไฟล์ที่ผู้สมัครแนบมา</p>
        ) : (
          <ul className="employer-job-files">
            {files.map(({ key, file, application }) => (
              <li key={key} className="ui-card">
                <span className="employer-job-file-icon" aria-hidden="true"><FileText size={20} /></span>
                <div className="employer-job-file-info">
                  <strong>{file.name}</strong>
                  <Link to={`/employer/applications/${application._id}`}>จาก {application.user.name}</Link>
                </div>
                <a href={file.url} target="_blank" rel="noreferrer" className="ui-btn ui-btn-outline"><Download size={15} aria-hidden="true" />เปิดไฟล์</a>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

export default JobDetail;
