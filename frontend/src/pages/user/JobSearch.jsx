import { useEffect, useState } from "react";
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
  const [jobs, setJobs] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [activeTab, setActiveTab] = useState("list");

  const [categories, setCategories] = useState([]);
  const [openFilter, setOpenFilter] = useState(null);
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [category, setCategory] = useState("");
  const [province, setProvince] = useState("");
  const [deadlineWithinDays, setDeadlineWithinDays] = useState("");
  const [resultLimit, setResultLimit] = useState("10");

  useEffect(() => {
    jobCategoryService.getJobCategories().then(setCategories);
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

  function load(params) {
    setLoading(true);
    jobService
      .searchJobs(params)
      .then((data) => {
        setJobs(data);
        setSelectedJobId(data[0]?._id || null);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    load(buildParams());
  }

  function applyFilter() {
    setOpenFilter(null);
    load(buildParams());
  }

  function toggleFilter(name) {
    setOpenFilter((prev) => (prev === name ? null : name));
  }

  const selectedJob = jobs.find((job) => job._id === selectedJobId) || null;
  const salaryActive = Boolean(minSalary || maxSalary);
  const visibleJobs = resultLimit === "all" ? jobs : jobs.slice(0, Number(resultLimit));

  return (
    <div className="job-search-page">
      <h1>ค้นหางาน</h1>

      <form className="job-search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="พิมพ์หางานที่คุณต้องการหาได้เลย (ตำแหน่งงาน สายงาน ทักษะ)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <input
          type="text"
          placeholder="ระบุตำบล อำเภอ"
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

      <div className="job-search-tabs">
        <button
          type="button"
          className={activeTab === "list" ? "active" : ""}
          onClick={() => setActiveTab("list")}
        >
          ตำแหน่งงาน
        </button>
        <button type="button" className={activeTab === "ai" ? "active" : ""} onClick={() => setActiveTab("ai")}>
          AI ตำแหน่งงาน
        </button>
      </div>

      {activeTab === "ai" ? (
        <p className="job-search-ai-note">งานแนะนำจาก AI จะมาในเฟสถัดไป</p>
      ) : loading ? (
        <p>กำลังโหลด...</p>
      ) : (
        <div className="job-search-layout">
          <div className="job-search-list">
            {jobs.length > 0 && (
              <div className="job-search-list-header">
                <span className="job-search-result-count">
                  พบ {jobs.length} ตำแหน่ง
                  {visibleJobs.length < jobs.length && ` (แสดง ${visibleJobs.length} รายการ)`}
                </span>
                <label className="job-search-limit-select">
                  แสดง
                  <select value={resultLimit} onChange={(e) => setResultLimit(e.target.value)}>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="all">ทั้งหมด</option>
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
                onClick={() => setSelectedJobId(job._id)}
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
          </div>

          <div className="job-search-preview">
            <JobPreview job={selectedJob} />
          </div>
        </div>
      )}
    </div>
  );
}

export default JobSearch;
