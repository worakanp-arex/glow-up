import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import JobPreview from "../../components/jobs/JobPreview.jsx";
import useConfirmDialog from "../../components/common/useConfirmDialog.jsx";
import useReasonDialog from "../../components/common/useReasonDialog.jsx";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Briefcase, Check, ChevronDown, ClipboardCheck, Mail, MapPin, Phone, Trash2, X } from "lucide-react";
import * as jobService from "../../services/jobService.js";
import { countByTab, useTabCounts } from "../../hooks/useTabCounts.js";
import { formatCourseDate } from "../../utils/courseDates.js";
import "./JobsModeration.css";

const PAGE_SIZE = 10;

const TABS = [
  { key: "pending", label: "รอตรวจสอบ", params: { verifiedStatus: "pending" } },
  { key: "verified", label: "ผ่านแล้ว", params: { verifiedStatus: "verified" } },
  { key: "rejected", label: "ไม่ผ่าน", params: { verifiedStatus: "rejected" } },
  { key: "all", label: "ทั้งหมด", params: {} },
];

function JobsModeration() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab = TABS.some((item) => item.key === requested) ? requested : "pending";
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [actionError, setActionError] = useState("");
  const { confirm, confirmDialog } = useConfirmDialog();
  const { askReason, reasonDialog } = useReasonDialog();
  const [counts, refreshCounts] = useTabCounts(() => countByTab(TABS, jobService.getAllJobsForAdminPage));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    const { params } = TABS.find((item) => item.key === tab);
    jobService
      .getAllJobsForAdminPage({ page, limit: PAGE_SIZE, ...params }, controller.signal)
      .then(({ items, total: count }) => {
        if (controller.signal.aborted) return;
        setJobs(items);
        setTotal(count);
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, tab]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function leave(job) {
    // Once a job's status no longer matches the tab it is shown in, take it out of the list.
    refreshCounts();
    if (tab === "all") return;
    setJobs((prev) => prev.filter((j) => j._id !== job._id));
    setTotal((count) => Math.max(0, count - 1));
  }

  async function approve(job) {
    setActionError("");
    try {
      await jobService.confirmJob(job._id, "verified");
      leave(job);
      if (tab === "all") setJobs((prev) => prev.map((j) => (j._id === job._id ? { ...j, verifiedStatus: "verified", rejectionReason: "" } : j)));
    } catch (err) {
      setActionError(err.response?.data?.message || "ยืนยันประกาศไม่สำเร็จ");
    }
  }

  function reject(job) {
    askReason({
      title: `ปฏิเสธประกาศงาน "${job.title}"`,
      description: "เหตุผลจะถูกส่งให้นายจ้างในการแจ้งเตือน และแสดงบนประกาศของเขา เพื่อให้แก้ไขแล้วส่งตรวจสอบใหม่ได้",
      label: "เหตุผลที่ปฏิเสธ",
      placeholder: "เช่น ไม่ระบุเงินเดือน หรือรายละเอียดงานไม่ชัดเจน",
      confirmLabel: "ปฏิเสธประกาศ",
      onConfirm: async (reason) => {
        await jobService.confirmJob(job._id, "rejected", reason);
        leave(job);
        if (tab === "all") setJobs((prev) => prev.map((j) => (j._id === job._id ? { ...j, verifiedStatus: "rejected", rejectionReason: reason } : j)));
      },
    });
  }

  function handleDelete(job) {
    confirm({
      title: "ลบประกาศงาน",
      message: `ต้องการลบประกาศงาน "${job.title}" ใช่ไหม? ใบสมัครของประกาศนี้จะถูกลบด้วย และไม่สามารถย้อนกลับได้`,
      confirmLabel: "ลบประกาศ",
      onConfirm: async () => {
        await jobService.deleteJob(job._id);
        setJobs((prev) => prev.filter((j) => j._id !== job._id));
        setTotal((count) => Math.max(0, count - 1));
        refreshCounts();
      },
    });
  }

  const header = (
    <PageHeader icon={ClipboardCheck} eyebrow="Admin" description={<>ตรวจสอบรายละเอียดประกาศงานใหม่ก่อนเผยแพร่ กดที่ประกาศเพื่อดูข้อมูลทั้งหมดของประกาศและนายจ้าง หากปฏิเสธต้องระบุเหตุผลให้นายจ้างทราบ</>}>ตรวจสอบประกาศงาน</PageHeader>
  );

  if (loadError) return <div className="jobs-moderation-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  return (
    <div className="jobs-moderation-page">
      {confirmDialog}
      {reasonDialog}
      {header}

      <div className="ui-tabs" role="tablist" aria-label="สถานะการตรวจสอบ">
        {TABS.map((item) => (
          <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className="ui-tab" onClick={() => { setPage(1); setOpenId(null); setSearchParams(item.key === "pending" ? {} : { tab: item.key }); }}>
            {item.label}{counts && ` (${counts[item.key] ?? 0})`}
          </button>
        ))}
      </div>

      {actionError && <p className="jobs-moderation-error" role="alert">{actionError}</p>}

      {loading ? <AsyncState /> : jobs.length === 0 ? (
        <p className="jobs-moderation-empty">{tab === "pending" ? "ไม่มีประกาศที่รอตรวจสอบ" : "ไม่มีประกาศงานในหมวดนี้"}</p>
      ) : (
        <ul className="jobs-moderation-list">
          {jobs.map((job) => {
            const open = openId === job._id;
            const employer = job.employer || {};
            return (
              <li key={job._id} className="ui-card jobs-moderation-item">
                <div className="jobs-moderation-row">
                  <button type="button" className="jobs-moderation-toggle" aria-expanded={open} onClick={() => setOpenId(open ? null : job._id)}>
                    <span className="jobs-moderation-thumb" aria-hidden="true">{job.imageUrl ? <img src={job.imageUrl} alt="" loading="lazy" /> : <Briefcase size={20} />}</span>
                    <span className="jobs-moderation-info">
                      <span className="jobs-moderation-title">{job.title}</span>
                      <span className="jobs-moderation-employer">{employer.companyName || employer.name}</span>
                      <span className="jobs-moderation-badges">
                        <StatusBadge status={job.status} />
                        <StatusBadge status={job.verifiedStatus} />
                      </span>
                    </span>
                    <ChevronDown size={16} className={open ? "is-open" : ""} aria-hidden="true" />
                  </button>
                  <div className="jobs-moderation-actions">
                    {job.verifiedStatus !== "verified" && (
                      <button type="button" className="jobs-moderation-approve" onClick={() => approve(job)}>
                        <Check size={16} />
                        <span>ยืนยัน</span>
                      </button>
                    )}
                    {job.verifiedStatus !== "rejected" && (
                      <button type="button" className="jobs-moderation-reject" onClick={() => reject(job)}>
                        <X size={16} />
                        <span>ปฏิเสธ</span>
                      </button>
                    )}
                    <button type="button" className="jobs-moderation-delete" onClick={() => handleDelete(job)} title="ลบ" aria-label={`ลบ ${job.title}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="jobs-moderation-detail">
                    {job.verifiedStatus === "rejected" && job.rejectionReason && <p className="jobs-moderation-reason"><strong>เหตุผลที่ปฏิเสธ:</strong> {job.rejectionReason}</p>}
                    <div className="jobs-moderation-detail-grid">
                      <div className="jobs-moderation-preview"><JobPreview job={job} showTitle={false} /></div>
                      <aside className="jobs-moderation-employer-card">
                        <h3>ข้อมูลนายจ้าง</h3>
                        <dl>
                          <div><dt>บริษัท</dt><dd>{employer.companyName || "-"}</dd></div>
                          <div><dt>ผู้ติดต่อ</dt><dd>{employer.name || "-"}</dd></div>
                          {employer.email && <div><dt><Mail size={13} aria-hidden="true" />อีเมล</dt><dd>{employer.email}</dd></div>}
                          {employer.phone && <div><dt><Phone size={13} aria-hidden="true" />โทรศัพท์</dt><dd>{employer.phone}</dd></div>}
                          {employer.taxId && <div><dt>เลขผู้เสียภาษี</dt><dd>{employer.taxId}</dd></div>}
                          {employer.address && <div><dt><MapPin size={13} aria-hidden="true" />ที่อยู่</dt><dd>{employer.address}</dd></div>}
                          {employer.businessType && <div><dt>ประเภทธุรกิจ</dt><dd>{employer.businessType}</dd></div>}
                          <div><dt>บัญชีนายจ้าง</dt><dd><StatusBadge status={employer.verifiedStatus || "pending"} /></dd></div>
                          <div><dt>สร้างประกาศเมื่อ</dt><dd>{formatCourseDate(job.createdAt) || "-"}</dd></div>
                        </dl>
                        {employer._id && <Link to={`/admin/users/${employer._id}`} className="ui-btn ui-btn-outline">ดูโปรไฟล์นายจ้าง</Link>}
                      </aside>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} pageCount={pageCount} setPage={setPage} total={total} />
    </div>
  );
}

export default JobsModeration;
