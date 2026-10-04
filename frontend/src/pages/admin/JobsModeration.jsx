import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Check, ClipboardCheck, Trash2, X } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import * as jobService from "../../services/jobService.js";
import useConfirmDialog from "../../components/common/useConfirmDialog.jsx";
import "./JobsModeration.css";

const PAGE_SIZE = 10;

function JobsModeration() {
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    jobService
      .getAllJobsForAdminPage({ page, limit: PAGE_SIZE }, controller.signal)
      .then(({ items, total: count }) => {
        if (controller.signal.aborted) return;
        setJobs(items);
        setTotal(count);
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function handleConfirm(job, status) {
    const updated = await jobService.confirmJob(job._id, status);
    setJobs((prev) => prev.map((j) => (j._id === job._id ? updated : j)));
  }

  const { confirm, confirmDialog } = useConfirmDialog();

  function handleDelete(job) {
    confirm({
      title: "ลบประกาศงาน",
      message: `ต้องการลบประกาศงาน "${job.title}" ใช่ไหม? การลบไม่สามารถย้อนกลับได้`,
      confirmLabel: "ลบประกาศ",
      onConfirm: async () => {
        await jobService.deleteJob(job._id);
        setJobs((prev) => prev.filter((j) => j._id !== job._id));
      },
    });
  }

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="jobs-moderation-page"><AsyncState /></div>;
  }

  return (
    <div className="jobs-moderation-page">
      {confirmDialog}
      <PageHeader icon={ClipboardCheck} description={<>ยืนยันหรือปฏิเสธประกาศงานใหม่ก่อนเผยแพร่ให้ผู้หางานเห็น</>}>ตรวจสอบประกาศงาน</PageHeader>

      {jobs.length === 0 && <p className="jobs-moderation-empty">ยังไม่มีประกาศงานในระบบ</p>}

      <ul className="jobs-moderation-list">
        {jobs.map((job) => (
          <li key={job._id}>
            <div className="jobs-moderation-info">
              <p className="jobs-moderation-title">{job.title}</p>
              <p className="jobs-moderation-employer">{job.employer?.companyName || job.employer?.name}</p>
              <div className="jobs-moderation-badges">
                <StatusBadge status={job.status} />
                <StatusBadge status={job.verifiedStatus} />
              </div>
            </div>
            <div className="jobs-moderation-actions">
              {job.verifiedStatus === "pending" && (
                <>
                  <button
                    type="button"
                    className="jobs-moderation-approve"
                    onClick={() => handleConfirm(job, "verified")}
                  >
                    <Check size={16} />
                    <span>ยืนยัน</span>
                  </button>
                  <button
                    type="button"
                    className="jobs-moderation-reject"
                    onClick={() => handleConfirm(job, "rejected")}
                  >
                    <X size={16} />
                    <span>ปฏิเสธ</span>
                  </button>
                </>
              )}
              <button type="button" className="jobs-moderation-delete" onClick={() => handleDelete(job)} title="ลบ">
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageCount={pageCount} setPage={setPage} total={total} />
    </div>
  );
}

export default JobsModeration;
