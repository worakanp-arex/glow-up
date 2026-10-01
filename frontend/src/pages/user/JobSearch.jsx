import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMobileLayout } from "../../hooks/useMobileLayout.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useJobSeeker } from "../../hooks/useJobSeeker.js";
import { skillMatch } from "../../utils/skillMatch.js";
import { Bookmark, Briefcase, MapPin, Search, Sparkles } from "lucide-react";
import JobPreview from "../../components/jobs/JobPreview.jsx";
import * as jobService from "../../services/jobService.js";
import * as jobCategoryService from "../../services/jobCategoryService.js";
import * as careerService from "../../services/careerService.js";
import { THAI_PROVINCES } from "../../constants/provinces.js";
import { initials } from "../../utils/initials.js";
import "./JobSearch.css";

const DEADLINE_OPTIONS = [
  { value: "", label: "ทุกช่วงเวลา" },
  { value: "7", label: "ปิดรับภายใน 7 วัน" },
  { value: "30", label: "ปิดรับภายใน 30 วัน" },
];

const SALARY_OPTIONS = [
  { value: "", label: "ทุกช่วงเงินเดือน", min: "", max: "" },
  { value: "0-10000", label: "ไม่เกิน 10,000 บาท", min: "", max: "10000" },
  { value: "10000-15000", label: "10,000 – 15,000 บาท", min: "10000", max: "15000" },
  { value: "15000-20000", label: "15,000 – 20,000 บาท", min: "15000", max: "20000" },
  { value: "20000-", label: "20,000 บาทขึ้นไป", min: "20000", max: "" },
];

const LOGO_TONES = ["primary", "peach", "lilac", "mint"];


function JobSearch() {
  const navigate = useNavigate();
  const mobile = useMobileLayout();
  const { user, isAuthenticated } = useAuth();
  const { isSeeker, mySkills, mySkillIds, savedIds, toggleSaved } = useJobSeeker();
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get("category") || "";
  const [jobs, setJobs] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState(categoryFromUrl ? { category: categoryFromUrl } : {});

  const [categories, setCategories] = useState([]);
  const [salaryRange, setSalaryRange] = useState("");
  const [category, setCategory] = useState(categoryFromUrl);
  const [province, setProvince] = useState("");
  const [deadlineWithinDays, setDeadlineWithinDays] = useState("");
  const [resultLimit, setResultLimit] = useState("10");
  const [recommendations, setRecommendations] = useState([]);
  const [savedOnly, setSavedOnly] = useState(false);

  useEffect(() => {
    jobCategoryService.getJobCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "user") return;
    careerService.getRecommendedCareers().then(setRecommendations).catch(() => setRecommendations([]));
  }, [isAuthenticated, user?.role]);

  // Build the query from current inputs; `override` lets a filter apply its
  // new value immediately instead of waiting for the state update.
  function buildParams(override = {}) {
    const values = { keyword, location, category, province, deadlineWithinDays, salaryRange, ...override };
    const salary = SALARY_OPTIONS.find((opt) => opt.value === values.salaryRange) || SALARY_OPTIONS[0];
    const params = {};
    if (values.keyword) params.keyword = values.keyword;
    if (values.location) params.location = values.location;
    if (salary.min) params.minSalary = salary.min;
    if (salary.max) params.maxSalary = salary.max;
    if (values.category) params.category = values.category;
    if (values.province) params.province = values.province;
    if (values.deadlineWithinDays) params.deadlineWithinDays = values.deadlineWithinDays;
    return params;
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    const request = savedOnly
      ? jobService.getSavedJobs().then((items) => ({ items, total: items.length }))
      : jobService.searchJobsPage({ ...appliedFilters, page, limit: resultLimit }, controller.signal);
    request
      .then(({ items, total: count }) => {
        if (controller.signal.aborted) return;
        setJobs(items);
        setTotal(count);
        setSelectedJobId(items[0]?._id || null);
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [appliedFilters, page, resultLimit, savedOnly]);

  function handleSubmit(e) {
    e.preventDefault();
    setSavedOnly(false);
    setPage(1);
    setAppliedFilters(buildParams());
  }

  function updateFilter(name, value, setter) {
    setter(value);
    setSavedOnly(false);
    setPage(1);
    setAppliedFilters(buildParams({ [name]: value }));
  }

  function selectRecommendedCategory(categoryId) {
    updateFilter("category", categoryId, setCategory);
  }

  const selectedJob = jobs.find((job) => job._id === selectedJobId) || null;

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  return (
    <div className="job-search-page">
      <PageHeader
        icon={Search}
        eyebrow="Your next chapter"
        description="เริ่มจากทักษะที่มี แล้วค่อย ๆ มองหาก้าวต่อไป"
        actions={isSeeker && <Link to="/my-applications" className="ui-btn ui-btn-outline">ใบสมัครของฉัน</Link>}
      >
        โอกาสที่เหมาะกับคุณ
      </PageHeader>

      <form className="job-search-form" onSubmit={handleSubmit}>
        <label className="job-search-field job-search-field-keyword">
          <Search size={18} aria-hidden="true" />
          <input
            type="text"
            placeholder="ตำแหน่งงาน ทักษะ หรือรายละเอียดงาน"
            aria-label="ค้นหาตำแหน่งงาน"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </label>
        <label className="job-search-field job-search-field-location">
          <MapPin size={18} aria-hidden="true" />
          <input
            type="text"
            placeholder="อำเภอ หรือ ตำบล"
            aria-label="พื้นที่ทำงาน"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <button type="submit" className="ui-btn ui-btn-primary">
          <Search size={16} aria-hidden="true" />
          <span>หางาน</span>
        </button>
      </form>

      <div className="job-search-filters">
        <label>
          <span>ประเภทงาน</span>
          <select value={category} onChange={(e) => updateFilter("category", e.target.value, setCategory)}>
            <option value="">ทั้งหมด</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </label>
        <label>
          <span>เงินเดือน</span>
          <select value={salaryRange} onChange={(e) => updateFilter("salaryRange", e.target.value, setSalaryRange)}>
            {SALARY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </label>
        <label>
          <span>จังหวัด</span>
          <select value={province} onChange={(e) => updateFilter("province", e.target.value, setProvince)}>
            <option value="">ทุกจังหวัด</option>
            {THAI_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label>
          <span>รับสมัคร</span>
          <select value={deadlineWithinDays} onChange={(e) => updateFilter("deadlineWithinDays", e.target.value, setDeadlineWithinDays)}>
            {DEADLINE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </label>
        {isSeeker && (
          <button
            type="button"
            className={`job-search-saved-toggle${savedOnly ? " active" : ""}`}
            aria-pressed={savedOnly}
            onClick={() => { setSavedOnly((v) => !v); setPage(1); }}
          >
            <Bookmark size={15} fill={savedOnly ? "currentColor" : "none"} aria-hidden="true" />
            งานที่บันทึก{savedIds.size > 0 && ` (${savedIds.size})`}
          </button>
        )}
      </div>

      {isSeeker && (
        <section className="job-search-skills">
          <span className="job-search-skills-icon" aria-hidden="true"><Sparkles size={18} /></span>
          <div className="job-search-skills-body">
            <strong>เริ่มจากทักษะที่คุณมี</strong>
            <span>
              {mySkills.length > 0
                ? mySkills.map((item) => item.skill?.skillName).filter(Boolean).join(" · ")
                : "เพิ่มทักษะในโปรไฟล์ เพื่อดูว่างานไหนตรงกับคุณ"}
            </span>
            {recommendations.length > 0 && (
              <div className="job-search-recommendations" aria-label="อาชีพแนะนำสำหรับคุณ">
                <small>อาชีพแนะนำ:</small>
                {recommendations.map((rec) => (
                  <button
                    key={rec.category._id}
                    type="button"
                    className={category === rec.category._id ? "active" : ""}
                    onClick={() => selectRecommendedCategory(rec.category._id)}
                    title={`ตรงกัน ${rec.match.score}% · ${rec.jobCount} ตำแหน่งงาน`}
                  >
                    {rec.category.name} <b>{rec.match.score}%</b>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link to="/profile?tab=skills" className="ui-card-link">แก้ไขทักษะ</Link>
        </section>
      )}

      {loading ? (
        <AsyncState />
      ) : (
        <div className="job-search-layout">
          <div className="job-search-list">
            {jobs.length > 0 && (
              <div className="job-search-list-header">
                <span className="job-search-result-count">
                  {savedOnly ? `งานที่บันทึกไว้ ${total} ตำแหน่ง` : `พบ ${total} ตำแหน่ง`}
                </span>
                {!savedOnly && (
                  <label className="job-search-limit-select">
                    แสดง
                    <select value={resultLimit} onChange={(e) => { setResultLimit(e.target.value); setPage(1); }}>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                    รายการ
                  </label>
                )}
              </div>
            )}
            {jobs.map((job, index) => {
              const match = isSeeker ? skillMatch(job, mySkillIds) : null;
              const saved = savedIds.has(job._id);
              const companyName = job.employer?.companyName || job.employer?.name;
              return (
                <div key={job._id} className={`job-list-card${selectedJobId === job._id ? " selected" : ""}`}>
                  <div className="job-list-card-top">
                    <span className={`job-list-card-logo tone-${LOGO_TONES[index % LOGO_TONES.length]}`} aria-hidden="true">
                      {job.employer?.avatarUrl ? <img src={job.employer.avatarUrl} alt="" /> : initials(companyName)}
                    </span>
                    <div className="job-list-card-actions">
                      {match && <span className={`job-list-card-match${match.score >= 70 ? " is-high" : ""}`}>ทักษะตรง {match.score}%</span>}
                      {isSeeker && (
                        <button
                          type="button"
                          className={`job-list-card-save${saved ? " is-saved" : ""}`}
                          onClick={() => toggleSaved(job._id)}
                          aria-pressed={saved}
                          aria-label={saved ? `เลิกบันทึก ${job.title}` : `บันทึก ${job.title}`}
                        >
                          <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="job-list-card-main"
                    onClick={() => mobile ? navigate(`/jobs/${job._id}`) : setSelectedJobId(job._id)}
                    aria-current={selectedJobId === job._id ? "true" : undefined}
                  >
                    <h2>{job.title}</h2>
                  </button>
                  <p className="job-list-card-company">{companyName}</p>
                  {job.location && <p className="job-list-card-location"><MapPin size={13} aria-hidden="true" />{job.location}</p>}
                  <div className="job-list-card-foot">
                    {job.salary > 0 ? <strong>{job.salary.toLocaleString()} <small>บาท/เดือน</small></strong> : <small className="ui-muted">ไม่ระบุเงินเดือน</small>}
                    {job.category?.name && <span className="job-list-card-type"><Briefcase size={12} aria-hidden="true" />{job.category.name}</span>}
                  </div>
                </div>
              );
            })}
            {jobs.length === 0 && (
              <p className="job-search-empty">
                {savedOnly ? "ยังไม่มีงานที่บันทึกไว้ — แตะไอคอนบุ๊กมาร์กบนการ์ดงานเพื่อเก็บไว้ดูภายหลัง" : "ไม่พบตำแหน่งงานที่ตรงกับเงื่อนไข"}
              </p>
            )}
            {!savedOnly && <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / Number(resultLimit)))} setPage={setPage} total={total} />}
          </div>

          {!mobile && <div className="job-search-preview">
            <JobPreview
              job={selectedJob}
              saved={selectedJob ? savedIds.has(selectedJob._id) : false}
              onToggleSave={toggleSaved}
              match={isSeeker && selectedJob ? skillMatch(selectedJob, mySkillIds) : null}
            />
          </div>}
        </div>
      )}
    </div>
  );
}

export default JobSearch;
