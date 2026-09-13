import PageHeader from "../../components/common/PageHeader.jsx";
import { Briefcase } from "lucide-react";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import JobPreview from "../../components/jobs/JobPreview.jsx";
import * as jobService from "../../services/jobService.js";
import "./JobDetail.css";

function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    setLoading(true);
    jobService
      .getJob(id)
      .then(setJob)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, [id]);

  const pageHeader = <PageHeader icon={Briefcase} backTo={"/jobs"} backLabel="ค้นหางาน">{job?.title || "รายละเอียดงาน"}</PageHeader>;

  if (loadError) return <div className="job-detail-page">{pageHeader}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) {
    return <div className="job-detail-page">{pageHeader}<AsyncState /></div>;
  }
  if (!job) {
    return <div className="job-detail-page">{pageHeader}ไม่พบตำแหน่งงานนี้</div>;
  }

  return (
    <div className="job-detail-page">
      {pageHeader}
      <JobPreview job={job} showTitle={false} />
    </div>
  );
}

export default JobDetail;
