import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import ApplicantRow from "../../components/employer/ApplicantRow.jsx";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ShieldAlert, Users } from "lucide-react";
import * as applicationService from "../../services/applicationService.js";
import "./Applicants.css";

const PAGE_SIZE = 10;
const STATUS_FILTERS = [
  { key: "", label: "ทั้งหมด" },
  { key: "pending", label: "รอพิจารณา" },
  { key: "interview", label: "นัดสัมภาษณ์" },
  { key: "passed", label: "ผ่านการคัดเลือก" },
  { key: "rejected", label: "ปฏิเสธ" },
];

// Every application to any of the employer's postings, newest first.
function Applications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("status") || "";
  const status = STATUS_FILTERS.some((item) => item.key === requested) ? requested : "";
  const [applications, setApplications] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    applicationService
      .getEmployerApplicationsPage({ page, limit: PAGE_SIZE, ...(status ? { status } : {}) }, controller.signal)
      .then(({ items, total: count }) => {
        if (controller.signal.aborted) return;
        setApplications(Array.isArray(items) ? items : []);
        setTotal(count);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err.response?.status === 403) setBlocked(true);
        else setLoadError(err);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, status]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const header = <PageHeader icon={Users} eyebrow="Employer space" description="ผู้สมัครจากทุกประกาศงานของบริษัท พร้อมข้อมูลเบื้องต้น" backTo="/employer/dashboard" backLabel="หน้าหลัก">ผู้สมัครทั้งหมด</PageHeader>;

  if (loadError) return <div className="applicants-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;
  if (blocked) {
    return (
      <div className="applicants-page">
        {header}
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
      {header}
      <div className="ui-tabs" role="tablist" aria-label="กรองสถานะใบสมัคร">
        {STATUS_FILTERS.map((item) => (
          <button key={item.key || "all"} type="button" role="tab" aria-selected={status === item.key} className="ui-tab" onClick={() => { setPage(1); setSearchParams(item.key ? { status: item.key } : {}); }}>
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <AsyncState /> : applications.length === 0 ? (
        <p className="applicants-empty">ยังไม่มีผู้สมัครในหมวดนี้</p>
      ) : (
        <ul className="applicants-list">
          {applications.map((application) => <ApplicantRow key={application._id} application={application} showJob />)}
        </ul>
      )}
      <Pagination page={page} pageCount={pageCount} setPage={setPage} total={total} />
    </div>
  );
}

export default Applications;
