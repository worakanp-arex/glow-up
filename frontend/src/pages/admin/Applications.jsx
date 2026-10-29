import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Briefcase, ChevronDown, FileSearch, Mail, MapPin, Paperclip, Phone } from "lucide-react";
import * as applicationService from "../../services/applicationService.js";
import { countByTab, useTabCounts } from "../../hooks/useTabCounts.js";
import "./Applications.css";

const PAGE_SIZE = 10;
const STATUS_FILTERS = [
  { key: "", label: "ทั้งหมด", params: {} },
  { key: "pending", label: "รอดำเนินการ", params: { status: "pending" } },
  { key: "interview", label: "นัดสัมภาษณ์", params: { status: "interview" } },
  { key: "passed", label: "ผ่านการคัดเลือก", params: { status: "passed" } },
  { key: "rejected", label: "ถูกปฏิเสธ", params: { status: "rejected" } },
  { key: "cancelled", label: "ยกเลิกแล้ว", params: { status: "cancelled" } },
];
const DATE = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" });

// ใบสมัครงานทั้งหมดในระบบ หนึ่งแถวที่ขยายได้ต่อหนึ่งใบสมัคร
function Applications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("status") || "";
  const status = STATUS_FILTERS.some((item) => item.key === requested) ? requested : "";
  const [applications, setApplications] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [counts] = useTabCounts(() => countByTab(STATUS_FILTERS, applicationService.getAllApplicationsPage));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    applicationService
      .getAllApplicationsPage({ page, limit: PAGE_SIZE, ...(status ? { status } : {}) }, controller.signal)
      .then(({ items, total: count }) => {
        if (controller.signal.aborted) return;
        setApplications(Array.isArray(items) ? items : []);
        setTotal(count);
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, status]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const header = <PageHeader icon={FileSearch} eyebrow="Admin" description="ใบสมัครงานทุกใบในระบบ กดที่แต่ละรายการเพื่อดูผู้สมัคร ตำแหน่ง และไฟล์ที่แนบ" backTo="/admin" backLabel="หน้าหลัก">ใบสมัครงานทั้งหมด</PageHeader>;

  if (loadError) return <div className="admin-applications-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  return (
    <div className="admin-applications-page">
      {header}
      <div className="ui-tabs" role="tablist" aria-label="กรองสถานะใบสมัคร">
        {STATUS_FILTERS.map((item) => (
          <button key={item.key || "all"} type="button" role="tab" aria-selected={status === item.key} className="ui-tab" onClick={() => { setPage(1); setOpenId(null); setSearchParams(item.key ? { status: item.key } : {}); }}>
            {item.label}{counts && ` (${counts[item.key] ?? 0})`}
          </button>
        ))}
      </div>

      {loading ? <AsyncState /> : applications.length === 0 ? (
        <p className="admin-applications-empty">ไม่พบใบสมัครในหมวดนี้</p>
      ) : (
        <ul className="admin-applications-list">
          {applications.map((application) => {
            const open = openId === application._id;
            const { user, job } = application;
            return (
              <li key={application._id} className="ui-card admin-application">
                <button type="button" className="admin-application-head" aria-expanded={open} onClick={() => setOpenId(open ? null : application._id)}>
                  <Avatar user={user} size={44} />
                  <span className="admin-application-text">
                    <strong>{user?.name || "ผู้สมัครที่ถูกลบ"}</strong>
                    <small><Briefcase size={12} aria-hidden="true" />{job?.title || "ประกาศที่ถูกลบ"}{job?.employer && ` · ${job.employer.companyName || job.employer.name}`}</small>
                  </span>
                  <StatusBadge status={application.status} />
                  <ChevronDown size={16} className={open ? "is-open" : ""} aria-hidden="true" />
                </button>

                {open && (
                  <div className="admin-application-body">
                    <dl>
                      <div><dt>วันที่สมัคร</dt><dd>{DATE.format(new Date(application.appliedAt || application.createdAt))}</dd></div>
                      {user?.email && <div><dt><Mail size={13} aria-hidden="true" />อีเมล</dt><dd>{user.email}</dd></div>}
                      {user?.phone && <div><dt><Phone size={13} aria-hidden="true" />โทรศัพท์</dt><dd>{user.phone}</dd></div>}
                      {user?.province && <div><dt><MapPin size={13} aria-hidden="true" />จังหวัด</dt><dd>{user.province}</dd></div>}
                      {user?.education && <div><dt>การศึกษา</dt><dd>{user.education}</dd></div>}
                      {user?.experience && <div><dt>ประสบการณ์</dt><dd>{user.experience}</dd></div>}
                      {job?.location && <div><dt>สถานที่ทำงาน</dt><dd>{job.location}</dd></div>}
                      {application.employerFeedback && <div><dt>ข้อเสนอแนะจากนายจ้าง</dt><dd>{application.employerFeedback}</dd></div>}
                      {application.rejectionReason && <div><dt>เหตุผลที่ปฏิเสธ</dt><dd>{application.rejectionReason}</dd></div>}
                    </dl>
                    {application.attachments?.length > 0 && (
                      <p className="admin-application-files">
                        <Paperclip size={14} aria-hidden="true" />
                        {application.attachments.map((file) => <a key={file.url} href={file.url} target="_blank" rel="noreferrer">{file.name}</a>)}
                      </p>
                    )}
                    <div className="admin-application-links">
                      {user?._id && <Link to={`/admin/users/${user._id}`} className="ui-btn ui-btn-outline">ดูโปรไฟล์ผู้สมัคร</Link>}
                      {job?._id && <Link to="/admin/jobs" className="ui-btn ui-btn-outline">ไปหน้าตรวจสอบประกาศงาน</Link>}
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

export default Applications;
