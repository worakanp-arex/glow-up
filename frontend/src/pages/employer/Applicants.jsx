import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import ApplicantRow from "../../components/employer/ApplicantRow.jsx";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldAlert, Users } from "lucide-react";
import * as applicationService from "../../services/applicationService.js";
import { getPreviousRoute } from "../../utils/routeHistory.js";
import "./Applicants.css";

const PAGE_SIZE = 10;

function Applicants() {
  const { jobId } = useParams();
  const [applicants, setApplicants] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    applicationService
      .getJobApplicantsPage(jobId, { page, limit: PAGE_SIZE }, controller.signal)
      .then(({ items, total: count }) => {
        if (controller.signal.aborted) return;
        setApplicants(items);
        setTotal(count);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err.response?.status === 403) {
          setBlocked(true);
        } else setLoadError(err);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [jobId, page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHeader = <PageHeader icon={Users} eyebrow="Employer space" description="ข้อมูลเบื้องต้นของผู้สมัครแต่ละคน กดที่ชื่อเพื่อดูรายละเอียดและไฟล์ที่แนบ" backTo={getPreviousRoute(`/employer/jobs/${jobId}/applicants`, "/employer/") || `/employer/jobs/${jobId}`} backLabel="หน้าที่คุณเข้ามา">{"ผู้สมัครงาน"}</PageHeader>;

  if (loadError) return <div className="applicants-page">{pageHeader}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) {
    return <div className="applicants-page">{pageHeader}<AsyncState /></div>;
  }

  if (blocked) {
    return (
      <div className="applicants-page">
      {pageHeader}
        <div className="applicants-verification-pending">
          <ShieldAlert size={28} />
          <p>บัญชีนายจ้างของคุณยังไม่ได้รับการยืนยันตัวตน</p>
          <p>กรุณารอการตรวจสอบจากผู้ดูแลระบบก่อนจึงจะดูรายชื่อผู้สมัครงานได้</p>
        </div>
      </div>
    );
  }

  return (
    <div className="applicants-page">
      {pageHeader}

      {applicants.length === 0 && <p className="applicants-empty">ยังไม่มีผู้สมัครสำหรับงานนี้</p>}

      <ul className="applicants-list">
        {applicants.map((app) => <ApplicantRow key={app._id} application={app} />)}
      </ul>
      <Pagination page={page} pageCount={pageCount} setPage={setPage} total={total} />
    </div>
  );
}

export default Applicants;
