import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Briefcase, MapPin, Pencil, Plus, Tag, Trash2, Users, Wallet } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import VerifyBanner from "../../components/employer/VerifyBanner.jsx";
import * as jobService from "../../services/jobService.js";
import useConfirmDialog from "../../components/common/useConfirmDialog.jsx";
import "./MyJobs.css";

const PAGE_SIZE = 10;

const FILTERS = [
  { key: "all", label: "ทั้งหมด", params: {} },
  { key: "open", label: "เปิดรับสมัคร", params: { status: "open", verifiedStatus: "verified" } },
  { key: "pending", label: "รอตรวจสอบ", params: { verifiedStatus: "pending" } },
  { key: "rejected", label: "ไม่ผ่านการตรวจสอบ", params: { verifiedStatus: "rejected" } },
  { key: "closed", label: "ปิดรับสมัคร", params: { status: "closed" } },
];

function MyJobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("filter");
  const filter = FILTERS.some((item) => item.key === requested) ? requested : "all";
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    const { params } = FILTERS.find((item) => item.key === filter);
    jobService
      .getMyJobsPage({ page, limit: PAGE_SIZE, ...params }, controller.signal)
      .then(({ items, total: count }) => {
        if (controller.signal.aborted) return;
        setJobs(items);
        setTotal(count);
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, filter]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function changeFilter(key) {
    setPage(1);
    setSearchParams(key === "all" ? {} : { filter: key });
  }

  async function handleToggleStatus(job) {
    const nextStatus = job.status === "open" ? "closed" : "open";
    const updated = await jobService.updateJob(job._id, { status: nextStatus });
    setJobs((prev) => prev.map((j) => (j._id === job._id ? updated : j)));
  }

  const { confirm, confirmDialog } = useConfirmDialog();

  function handleDelete(job) {
    confirm({
      title: "ลบประกาศงาน",
      message: `ต้องการลบประกาศงาน "${job.title}" ใช่ไหม? ใบสมัครทั้งหมดของงานนี้จะถูกลบด้วย และไม่สามารถย้อนกลับได้`,
      confirmLabel: "ลบประกาศ",
      onConfirm: async () => {
        await jobService.deleteJob(job._id);
        setJobs((prev) => prev.filter((j) => j._id !== job._id));
        setTotal((count) => Math.max(0, count - 1));
      },
    });
  }

  const header = (
    <PageHeader
      icon={Briefcase}
      eyebrow="Employer space"
      description="จัดการประกาศงาน ดูผู้สมัคร และแก้ไขรายละเอียดได้จากที่นี่"
      actions={<Link to="/employer/jobs/new" className="ui-btn ui-btn-primary">
        <Plus size={16} />
        <span>สร้างประกาศงานใหม่</span>
      </Link>}
    >ประกาศงานของฉัน</PageHeader>
  );

  if (loadError) return <div className="my-jobs-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  return (
    <div className="my-jobs-page">
      {confirmDialog}
      {header}
      <VerifyBanner />

      <div className="ui-tabs" role="tablist" aria-label="กรองประกาศงาน">
        {FILTERS.map((item) => (
          <button key={item.key} type="button" role="tab" aria-selected={filter === item.key} className="ui-tab" onClick={() => changeFilter(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <AsyncState /> : jobs.length === 0 ? (
        <p className="my-jobs-empty">{filter === "all" ? "คุณยังไม่มีประกาศงาน" : "ไม่มีประกาศงานในหมวดนี้"}</p>
      ) : (
        <ul className="my-jobs-list">
          {jobs.map((job) => (
            <li key={job._id} className="ui-card my-jobs-item">
              <Link to={`/employer/jobs/${job._id}`} className="my-jobs-icon" aria-hidden="true" tabIndex={-1}>
                {job.imageUrl ? <img src={job.imageUrl} alt="" loading="lazy" /> : <Briefcase size={22} />}
              </Link>

              <div className="my-jobs-info">
                <Link to={`/employer/jobs/${job._id}`} className="my-jobs-title">{job.title}</Link>
                <div className="my-jobs-meta">
                  {job.category?.name && <span><Tag size={13} />{job.category.name}</span>}
                  {job.location && <span><MapPin size={13} />{job.location}</span>}
                  {job.salary && <span><Wallet size={13} />{job.salary.toLocaleString()} บาท</span>}
                </div>
                <div className="my-jobs-badges">
                  <StatusBadge status={job.status} />
                  <StatusBadge status={job.verifiedStatus} />
                </div>
                {job.verifiedStatus === "rejected" && (
                  <p className="my-jobs-reason" role="note">
                    <strong>ไม่ผ่านการตรวจสอบ</strong>{job.rejectionReason ? `: ${job.rejectionReason}` : " กรุณาแก้ไขประกาศแล้วส่งตรวจสอบอีกครั้ง"}
                  </p>
                )}
              </div>

              <div className="my-jobs-actions">
                <Link to={`/employer/jobs/${job._id}/applicants`} className="ui-btn ui-btn-outline">
                  <Users size={15} />
                  <span>ผู้สมัคร</span>
                </Link>
                <Link to={`/employer/jobs/${job._id}/edit`} className="ui-btn ui-btn-outline">
                  <Pencil size={15} />
                  <span>แก้ไข</span>
                </Link>
                <button type="button" className="ui-btn ui-btn-outline" onClick={() => handleToggleStatus(job)}>
                  {job.status === "open" ? "ปิดรับสมัคร" : "เปิดรับสมัคร"}
                </button>
                <button type="button" className="my-jobs-delete" onClick={() => handleDelete(job)} aria-label={`ลบประกาศงาน ${job.title}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageCount={pageCount} setPage={setPage} total={total} />
    </div>
  );
}

export default MyJobs;
