import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import JobPreview from "../../components/jobs/JobPreview.jsx";
import * as jobService from "../../services/jobService.js";
import "./JobDetail.css";

function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    jobService
      .getJob(id)
      .then(setJob)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="job-detail-page">กำลังโหลด...</div>;
  }
  if (!job) {
    return <div className="job-detail-page">ไม่พบตำแหน่งงานนี้</div>;
  }

  return (
    <div className="job-detail-page">
      <JobPreview job={job} />
    </div>
  );
}

export default JobDetail;
