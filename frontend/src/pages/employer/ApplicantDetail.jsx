import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { UserRound, Award, Briefcase, FileText, GraduationCap, Mail, MapPin, Paperclip, Phone, ShieldAlert, Sparkles, Wallet } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import * as applicationService from "../../services/applicationService.js";
import { getPreviousRoute } from "../../utils/routeHistory.js";
import { jobSummary } from "../../utils/jobDescription.js";
import "./ApplicantDetail.css";

const STATUS_OPTIONS = ["pending", "interview", "passed", "rejected"];
const STATUS_LABELS = {
  pending: "รอดำเนินการ",
  interview: "นัดสัมภาษณ์",
  passed: "ผ่านการคัดเลือก",
  rejected: "ปฏิเสธ",
};

function ApplicantDetail() {
  const { id } = useParams();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState("pending");
  const [employerFeedback, setEmployerFeedback] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
        // 403 มีสองแบบ: บัญชีนายจ้างยังไม่ผ่านการยืนยัน (มีข้อความไทยจากเซิร์ฟเวอร์) กับใบสมัครของนายจ้างคนอื่น ("Forbidden")
        // 404 คือไม่พบใบสมัคร ปล่อยให้ application เป็น null เพื่อแสดง "ไม่พบใบสมัครนี้"
        const { status: code, data } = err.response || {};
        if (code === 403 && data?.message !== "Forbidden") setBlocked(true);
        else if (code === 403) setLoadError({ response: { data: { message: "คุณไม่มีสิทธิ์ดูใบสมัครนี้" } } });
        else if (code !== 404) setLoadError(err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const updated = await applicationService.updateApplicationStatus(id, {
        status,
        employerFeedback,
        rejectionReason,
      });
      // ผลบันทึกจากเซิร์ฟเวอร์ไม่มีคะแนนความตรงของทักษะ (คำนวณเฉพาะตอนโหลด) จึงคงค่าเดิมไว้
      setApplication((prev) => ({ ...updated, match: prev?.match }));
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const fallbackBack = application?.job?._id ? `/employer/jobs/${application.job._id}/applicants` : "/employer/jobs";
  const pageHeader = <PageHeader icon={UserRound} eyebrow="Employer space" backTo={getPreviousRoute(`/employer/applications/${id}`, "/employer/") || fallbackBack} backLabel="หน้าที่คุณเข้ามา">{"รายละเอียดผู้สมัครงาน"}</PageHeader>;

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

  const { user } = application;
  const facts = [user.age ? `อายุ ${user.age} ปี` : null, user.gender || null].filter(Boolean);

  return (
    <div className="applicant-detail-page">
      {pageHeader}
      <div className="applicant-detail-banner ui-card">
        <div className="applicant-detail-banner-top" />
        <div className="applicant-detail-banner-body">
          <span className="applicant-detail-avatar">
            <Avatar user={user} size={72} fill />
          </span>
          <div className="applicant-detail-banner-text">
            <h2 className="page-context-title">{user.name}{user.nickname && <small> ({user.nickname})</small>}</h2>
            <p className="applicant-detail-job">
              <Briefcase size={14} />
              สมัครตำแหน่ง: {application.job.title}
            </p>
          </div>
          <StatusBadge status={application.status} />
        </div>
      </div>

      <div className="applicant-detail-layout">
        <div className="applicant-detail-main">
          <section className="ui-card applicant-detail-info">
            <div className="ui-card-head"><h2>ข้อมูลส่วนตัว</h2></div>
            <dl className="applicant-detail-facts">
              {user.email && <div><dt><Mail size={14} aria-hidden="true" />อีเมล</dt><dd>{user.email}</dd></div>}
              {user.phone && <div><dt><Phone size={14} aria-hidden="true" />โทรศัพท์</dt><dd>{user.phone}</dd></div>}
              {facts.length > 0 && <div><dt><UserRound size={14} aria-hidden="true" />ข้อมูลทั่วไป</dt><dd>{facts.join(" · ")}</dd></div>}
              {user.province && <div><dt><MapPin size={14} aria-hidden="true" />จังหวัด</dt><dd>{user.province}</dd></div>}
              {user.education && <div><dt><GraduationCap size={14} aria-hidden="true" />การศึกษา</dt><dd>{user.education}</dd></div>}
              {user.experience && <div><dt><Briefcase size={14} aria-hidden="true" />ประสบการณ์</dt><dd>{user.experience}</dd></div>}
              {user.verifiedStatus && <div><dt>ยืนยันตัวตน</dt><dd><StatusBadge status={user.verifiedStatus} /></dd></div>}
            </dl>
            {user.bio && <p className="applicant-detail-bio">{user.bio}</p>}
          </section>

          <section className="ui-card applicant-detail-job-card">
            <div className="ui-card-head"><h2><Briefcase size={16} aria-hidden="true" /> งานที่สมัคร</h2></div>
            <p className="applicant-detail-job-title">{application.job.title}</p>
            <dl className="applicant-detail-facts">
              {application.job.location && <div><dt><MapPin size={14} aria-hidden="true" />สถานที่ทำงาน</dt><dd>{application.job.location}</dd></div>}
              {application.job.salary > 0 && <div><dt><Wallet size={14} aria-hidden="true" />เงินเดือน</dt><dd>{application.job.salary.toLocaleString()} บาท/เดือน</dd></div>}
            </dl>
            {jobSummary(application.job.description) && <p className="applicant-detail-job-desc">{jobSummary(application.job.description)}</p>}
            <Link to={`/employer/jobs/${application.job._id}`} className="ui-card-link">ดูรายละเอียดประกาศงาน</Link>
          </section>

          <section className="ui-card applicant-detail-match-card">
            <div className="ui-card-head"><h2><Sparkles size={16} aria-hidden="true" /> ความตรงกันของทักษะ</h2></div>
            <p>
              คะแนนทักษะตรงกับงาน: <strong>{application.match ? `${application.match.score}%` : "งานนี้ไม่ได้ระบุทักษะที่ต้องการ"}</strong>
            </p>
            {application.match && (
              <>
                <div className="ui-progress"><span style={{ width: `${application.match.score}%` }} /></div>
                <small>{application.match.matchedSkills.length} / {application.match.totalSkills} ทักษะที่ตรงกับที่ประกาศ</small>
                {application.match.matchedSkills.length > 0 && (
                  <p className="applicant-detail-match-tags">ทักษะที่ตรง: {application.match.matchedSkills.join(", ")}</p>
                )}
                {application.match.missingSkills?.length > 0 && (
                  <p className="applicant-detail-match-tags">ทักษะที่ยังไม่ตรง: {application.match.missingSkills.join(", ")}</p>
                )}
              </>
            )}
          </section>

          {(user.resumeUrl || user.certificates?.length > 0) && (
            <section className="ui-card applicant-detail-attachments">
              <div className="ui-card-head"><h2><FileText size={16} aria-hidden="true" /> เรซูเม่และใบรับรอง</h2></div>
              <ul>
                {user.resumeUrl && (
                  <li>
                    <a href={user.resumeUrl} target="_blank" rel="noreferrer">เรซูเม่</a>
                  </li>
                )}
                {user.certificates?.map((cert, i) => (
                  <li key={i}>
                    <a href={cert.url} target="_blank" rel="noreferrer">
                      <Award size={13} />
                      {cert.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {application.attachments?.length > 0 && (
            <section className="ui-card applicant-detail-attachments">
              <div className="ui-card-head"><h2><Paperclip size={16} aria-hidden="true" /> เอกสารที่แนบมาด้วย</h2></div>
              <ul>
                {application.attachments.map((file, i) => (
                  <li key={i}>
                    <a href={file.url} target="_blank" rel="noreferrer">{file.name}</a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="applicant-detail-side">
          {application.status === "cancelled" ? (
            <div className="ui-card applicant-detail-info">
              <p>
                สถานะใบสมัคร: <StatusBadge status={application.status} />
              </p>
              <p className="applicant-detail-match-note">ผู้สมัครยกเลิกใบสมัครนี้แล้ว ไม่สามารถเปลี่ยนสถานะได้</p>
            </div>
          ) : (
            <form className="ui-card applicant-detail-form" onSubmit={handleSubmit}>
              <div className="ui-card-head"><h2>พิจารณาใบสมัคร</h2></div>
              {error && <p className="applicant-detail-error" role="alert">{error}</p>}
              {saved && <p className="applicant-detail-saved" role="status">บันทึกแล้ว และแจ้งผู้สมัครเรียบร้อย</p>}

              <label className="ui-field">
                สถานะใบสมัคร
                <select value={status} onChange={(e) => { setStatus(e.target.value); setSaved(false); }}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {STATUS_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ui-field">
                ข้อเสนอแนะถึงผู้สมัคร
                <textarea
                  value={employerFeedback}
                  onChange={(e) => setEmployerFeedback(e.target.value)}
                  rows={3}
                />
              </label>

              {status === "rejected" && (
                <label className="ui-field">
                  เหตุผลที่ปฏิเสธ
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                  />
                </label>
              )}

              <button type="submit" className="ui-btn ui-btn-primary ui-btn-block" disabled={saving}>
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}

export default ApplicantDetail;
