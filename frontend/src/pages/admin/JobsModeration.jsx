import Pagination from "../../components/common/Pagination.jsx";
import { usePagination } from "../../hooks/usePagination.js";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Check, ClipboardCheck, Trash2, X } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import * as jobService from "../../services/jobService.js";
import "./JobsModeration.css";

function JobsModeration() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const pagination = usePagination(jobs);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    jobService
      .getAllJobsForAdmin()
      .then(setJobs)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }

  async function handleConfirm(job, status) {
    const updated = await jobService.confirmJob(job._id, status);
    setJobs((prev) => prev.map((j) => (j._id === job._id ? updated : j)));
  }

  async function handleDelete(job) {
    if (!window.confirm(`ลบประกาศงาน "${job.title}"?`)) return;
    await jobService.deleteJob(job._id);
    setJobs((prev) => prev.filter((j) => j._id !== job._id));
  }

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="jobs-moderation-page"><AsyncState /></div>;
  }

  return (
    <div className="jobs-moderation-page">
      <h1>
        <ClipboardCheck size={22} />
        <span>ตรวจสอบประกาศงาน</span>
      </h1>
      <p className="jobs-moderation-subtitle">ยืนยันหรือปฏิเสธประกาศงานใหม่ก่อนเผยแพร่ให้ผู้หางานเห็น</p>

      {jobs.length === 0 && <p className="jobs-moderation-empty">ยังไม่มีประกาศงานในระบบ</p>}

      <ul className="jobs-moderation-list">
        {pagination.items.map((job) => (
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
      <Pagination {...pagination} />
    </div>
  );
}

export default JobsModeration;
