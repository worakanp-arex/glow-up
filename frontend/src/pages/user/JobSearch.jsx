import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMobileLayout } from "../../hooks/useMobileLayout.js";
import { MapPin, Search, Wallet } from "lucide-react";
import JobPreview from "../../components/jobs/JobPreview.jsx";
import * as jobService from "../../services/jobService.js";
import * as jobCategoryService from "../../services/jobCategoryService.js";
import { THAI_PROVINCES } from "../../constants/provinces.js";
import "./JobSearch.css";

const DEADLINE_OPTIONS = [
  { value: "", label: "ทั้งหมด" },
  { value: "7", label: "ปิดรับภายใน 7 วัน" },
  { value: "30", label: "ปิดรับภายใน 30 วัน" },
];

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function JobSearch() {
  const navigate = useNavigate();
  const mobile = useMobileLayout();
  const [jobs, setJobs] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState({});

  const [categories, setCategories] = useState([]);
  const [openFilter, setOpenFilter] = useState(null);
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [category, setCategory] = useState("");
  const [province, setProvince] = useState("");
  const [deadlineWithinDays, setDeadlineWithinDays] = useState("");
  const [resultLimit, setResultLimit] = useState("10");

  useEffect(() => {
    jobCategoryService.getJobCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  function buildParams() {
    const params = {};
    if (keyword) params.keyword = keyword;
    if (location) params.location = location;
    if (minSalary) params.minSalary = minSalary;
    if (maxSalary) params.maxSalary = maxSalary;
    if (category) params.category = category;
    if (province) params.province = province;
    if (deadlineWithinDays) params.deadlineWithinDays = deadlineWithinDays;
    return params;
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    jobService
      .searchJobsPage({ ...appliedFilters, page, limit: resultLimit }, controller.signal)
      .then(({ items, total: count }) => {
        if (controller.signal.aborted) return;
        setJobs(items);
        setTotal(count);
        setSelectedJobId(items[0]?._id || null);
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [appliedFilters, page, resultLimit]);

  function handleSubmit(e) {
    e.preventDefault();
    setPage(1);
    setAppliedFilters(buildParams());
  }

  function applyFilter() {
    setOpenFilter(null);
    setPage(1);
    setAppliedFilters(buildParams());
  }

  function toggleFilter(name) {
    setOpenFilter((prev) => (prev === name ? null : name));
  }

  const selectedJob = jobs.find((job) => job._id === selectedJobId) || null;
  const salaryActive = Boolean(minSalary || maxSalary);
  const visibleJobs = jobs;

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  return (
    <div className="job-search-page">
      <PageHeader icon={Search}>ค้นหางาน</PageHeader>

      <form className="job-search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="ค้นหาตำแหน่งงานหรือรายละเอียดงาน"
          aria-label="ค้นหาตำแหน่งงาน"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <input
          type="text"
          placeholder="ระบุตำบล อำเภอ"
          aria-label="พื้นที่ทำงาน"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button type="submit">
          <Search size={16} />
          <span>หางาน</span>
        </button>
      </form>

      <div className="job-search-chip-row">
        <div className="job-search-chip-wrapper">
          <button
            type="button"
            className={`job-search-chip${salaryActive ? " active" : ""}`}
            onClick={() => toggleFilter("salary")}
          >
            เงินเดือน
          </button>
          {openFilter === "salary" && (
            <div className="job-search-popover">
              <label>
                ตั้งแต่
                <input
                  type="number"
                  min={0}
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                />
              </label>
              <label>
                ถึง
                <input
                  type="number"
                  min={0}
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(e.target.value)}
                />
              </label>
              <button type="button" onClick={applyFilter}>
                ใช้ตัวกรอง
              </button>
            </div>
          )}
        </div>

        <div className="job-search-chip-wrapper">
          <button
            type="button"
            className={`job-search-chip${category ? " active" : ""}`}
            onClick={() => toggleFilter("category")}
          >
            ประเภท
          </button>
          {openFilter === "category" && (
            <div className="job-search-popover">
              <label>
                ประเภทงาน
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">ทั้งหมด</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={applyFilter}>
                ใช้ตัวกรอง
              </button>
            </div>
          )}
        </div>

        <div className="job-search-chip-wrapper">
          <button
            type="button"
            className={`job-search-chip${province ? " active" : ""}`}
            onClick={() => toggleFilter("province")}
          >
            ระยะทาง
          </button>
          {openFilter === "province" && (
            <div className="job-search-popover">
              <label>
                จังหวัด
                <select value={province} onChange={(e) => setProvince(e.target.value)}>
                  <option value="">ทั้งหมด</option>
                  {THAI_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={applyFilter}>
                ใช้ตัวกรอง
              </button>
            </div>
          )}
        </div>

        <div className="job-search-chip-wrapper">
          <button
            type="button"
            className={`job-search-chip${deadlineWithinDays ? " active" : ""}`}
            onClick={() => toggleFilter("deadline")}
          >
            เวลารับสมัคร
          </button>
          {openFilter === "deadline" && (
            <div className="job-search-popover">
              <label>
                เปิดรับสมัคร
                <select value={deadlineWithinDays} onChange={(e) => setDeadlineWithinDays(e.target.value)}>
                  {DEADLINE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={applyFilter}>
                ใช้ตัวกรอง
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <AsyncState />
      ) : (
        <div className="job-search-layout">
          <div className="job-search-list">
            {jobs.length > 0 && (
              <div className="job-search-list-header">
                <span className="job-search-result-count">
                  พบ {total} ตำแหน่ง
                </span>
                <label className="job-search-limit-select">
                  แสดง
                  <select value={resultLimit} onChange={(e) => { setResultLimit(e.target.value); setPage(1); }}>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                  รายการ
                </label>
              </div>
            )}
            {visibleJobs.map((job) => (
              <button
                key={job._id}
                type="button"
                className={`job-list-card${selectedJobId === job._id ? " selected" : ""}`}
                onClick={() => mobile ? navigate(`/jobs/${job._id}`) : setSelectedJobId(job._id)}
              >
                <div className="job-list-card-header">
                  <h2>{job.title}</h2>
                  <span className="job-list-card-logo">
                    {job.employer?.avatarUrl ? (
                      <img src={job.employer.avatarUrl} alt="" />
                    ) : (
                      initials(job.employer?.companyName || job.employer?.name)
                    )}
                  </span>
                </div>
                <p className="job-list-card-company">{job.employer?.companyName || job.employer?.name}</p>
                <div className="job-list-card-meta">
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
              </button>
            ))}
            {jobs.length === 0 && <p className="job-search-empty">ไม่พบตำแหน่งงานที่ตรงกับเงื่อนไข</p>}
            <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / Number(resultLimit)))} setPage={setPage} total={total} />
          </div>

          {!mobile && <div className="job-search-preview">
            <JobPreview job={selectedJob} />
          </div>}
        </div>
      )}
    </div>
  );
}

export default JobSearch;
