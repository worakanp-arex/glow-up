import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, MapPin, Plus, Tag, Trash2, Users, Wallet } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import * as jobService from "../../services/jobService.js";
import "./MyJobs.css";

function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    jobService
      .getMyJobs()
      .then(setJobs)
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

  if (loading) {
    return <div className="my-jobs-page">กำลังโหลด...</div>;
  }

  return (
    <div className="my-jobs-page">
      <div className="my-jobs-header">
        <h1>
          <Briefcase size={22} />
          <span>ประกาศงานของฉัน</span>
        </h1>
        <Link to="/employer/jobs/new" className="btn btn-primary">
          <Plus size={16} />
          <span>สร้างประกาศงานใหม่</span>
        </Link>
      </div>

      {jobs.length === 0 && <p className="my-jobs-empty">คุณยังไม่มีประกาศงาน</p>}

      <ul className="my-jobs-list">
        {jobs.map((job) => (
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
    </div>
  );
}

export default MyJobs;
