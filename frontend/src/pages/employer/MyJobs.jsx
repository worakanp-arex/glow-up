import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { usePagination } from "../../hooks/usePagination.js";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, MapPin, Plus, Tag, Trash2, Users, Wallet } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import * as jobService from "../../services/jobService.js";
import "./MyJobs.css";

function MyJobs() {
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
      .getMyJobs()
      .then(setJobs)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }

  async function handleToggleStatus(job) {
    const nextStatus = job.status === "open" ? "closed" : "open";
    const updated = await jobService.updateJob(job._id, { status: nextStatus });
    setJobs((prev) => prev.map((j) => (j._id === job._id ? updated : j)));
  }

  async function handleDelete(job) {
    if (!window.confirm(`ลบประกาศงาน "${job.title}"?`)) return;
    await jobService.deleteJob(job._id);
    setJobs((prev) => prev.filter((j) => j._id !== job._id));
  }

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="my-jobs-page"><AsyncState /></div>;
  }

  return (
    <div className="my-jobs-page">
      <PageHeader icon={Briefcase} actions={<Link to="/employer/jobs/new" className="btn btn-primary">
          <Plus size={16} />
          <span>สร้างประกาศงานใหม่</span>
        </Link>}>ประกาศงานของฉัน</PageHeader>

      {jobs.length === 0 && <p className="my-jobs-empty">คุณยังไม่มีประกาศงาน</p>}

      <ul className="my-jobs-list">
        {pagination.items.map((job) => (
          <li key={job._id}>
            <div className="my-jobs-icon">
              <Briefcase size={20} />
            </div>

            <div className="my-jobs-info">
              <p className="my-jobs-title">{job.title}</p>
              <div className="my-jobs-meta">
                {job.category?.name && (
                  <span>
                    <Tag size={13} />
                    {job.category.name}
                  </span>
                )}
                {job.location && (
                  <span>
                    <MapPin size={13} />
                    {job.location}
                  </span>
                )}
                {job.salary && (
                  <span>
                    <Wallet size={13} />
                    {job.salary.toLocaleString()} บาท
                  </span>
                )}
              </div>
              <div className="my-jobs-badges">
                <StatusBadge status={job.status} />
                <StatusBadge status={job.verifiedStatus} />
              </div>
            </div>

            <div className="my-jobs-actions">
              <Link to={`/employer/jobs/${job._id}/applicants`} className="my-jobs-action-link">
                <Users size={15} />
                <span>ผู้สมัคร</span>
              </Link>
              <button type="button" className="my-jobs-action-btn" onClick={() => handleToggleStatus(job)}>
                {job.status === "open" ? "ปิดรับสมัคร" : "เปิดรับสมัคร"}
              </button>
              <button
                type="button"
                className="my-jobs-delete"
                onClick={() => handleDelete(job)}
                aria-label="ลบประกาศงาน"
              >
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

export default MyJobs;
