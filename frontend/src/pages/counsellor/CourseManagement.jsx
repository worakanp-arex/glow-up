import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import EditorDialog from "../../components/common/EditorDialog.jsx";
import CoverPicker from "../../components/common/CoverPicker.jsx";
import ImageSlot from "../../components/common/ImageSlot.jsx";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, Eye, ExternalLink, ImagePlus, Pencil, Plus } from "lucide-react";
import * as courseService from "../../services/courseService.js";
import { COURSE_COVER_OPTIONS } from "../../constants/courseCovers.js";
import { courseCover } from "../../utils/courseCover.js";
import { courseRange, courseStatus, toDateInputValue } from "../../utils/courseDates.js";
import "./CourseManagement.css";

const EMPTY_FORM = { title: "", description: "", category: "", externalUrl: "", tagsInput: "", startDate: "", endDate: "", coverImage: "" };
const MAX_COVER_BYTES = 3 * 1024 * 1024;

const TABS = [
  { key: "active", label: "เปิดอยู่" },
  { key: "upcoming", label: "ยังไม่เปิด" },
  { key: "expired", label: "หมดอายุแล้ว" },
  { key: "all", label: "ทั้งหมด" },
];

// "Open now" covers both plain and soon-to-expire courses.
function belongsTo(tab, course) {
  const { state } = courseStatus(course);
  if (tab === "all") return true;
  if (tab === "active") return state === "active" || state === "expiring" || state === "open";
  return state === tab;
}

function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState("active");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const coverInput = useRef(null);

  useEffect(() => {
    // Staff see every course, including ones that are not open yet or have expired.
    courseService
      .getCourses({ status: "all" })
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const invalidPeriod = form.startDate && form.endDate && form.endDate < form.startDate;
  const isUploaded = form.coverImage.startsWith("/uploads/");
  const coverOptions = isUploaded
    ? [{ key: form.coverImage, label: "รูปที่อัปโหลด", kind: "image", value: form.coverImage, group: "รูปของคุณ" }, ...COURSE_COVER_OPTIONS]
    : COURSE_COVER_OPTIONS;

  function open(course) {
    setForm(course ? {
      title: course.title,
      description: course.description || "",
      category: course.category || "",
      externalUrl: course.externalUrl,
      tagsInput: (course.tags || []).join(", "),
      startDate: toDateInputValue(course.startDate),
      endDate: toDateInputValue(course.endDate),
      coverImage: course.coverImage || "",
    } : EMPTY_FORM);
    setUploadError("");
    setEditing(course || "new");
  }

  async function handleCover(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_COVER_BYTES) {
      setUploadError("รูปต้องมีขนาดไม่เกิน 3 MB");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const { url } = await courseService.uploadCourseCover(file);
      set("coverImage", url);
    } catch (err) {
      setUploadError(err.response?.data?.message || "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      externalUrl: form.externalUrl,
      tags: form.tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      startDate: form.startDate,
      endDate: form.endDate,
      coverImage: form.coverImage,
    };
    if (editing === "new") {
      const created = await courseService.createCourse(payload);
      setCourses((prev) => [created, ...prev]);
    } else {
      const updated = await courseService.updateCourse(editing._id, payload);
      setCourses((prev) => prev.map((course) => (course._id === updated._id ? updated : course)));
    }
  }

  const header = (
    <PageHeader
      art="nurse"
      icon={BookOpen}
      eyebrow="Learning center"
      description="เพิ่มและแก้ไขคอร์สเรียนจากแหล่งภายนอก กำหนดวันเปิดและวันหมดอายุ และเลือกภาพปกให้คอร์ส"
      actions={<button type="button" className="ui-btn ui-btn-primary" onClick={() => open(null)}><Plus size={16} aria-hidden="true" />เพิ่มคอร์สใหม่</button>}
    >
      จัดการคอร์สเรียน
    </PageHeader>
  );

  if (loadError) return <div className="course-management-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  const visible = courses.filter((course) => belongsTo(tab, course));

  return (
    <div className="course-management-page">
      {header}

      <div className="ui-tabs" role="tablist" aria-label="สถานะคอร์ส">
        {TABS.map((item) => (
          <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className="ui-tab" onClick={() => setTab(item.key)}>
            {item.label} ({courses.filter((course) => belongsTo(item.key, course)).length})
          </button>
        ))}
      </div>

      {loading ? (
        <AsyncState />
      ) : visible.length === 0 ? (
        <p className="course-management-empty">{courses.length === 0 ? "ยังไม่มีคอร์สเรียนในระบบ" : "ไม่มีคอร์สในหมวดนี้"}</p>
      ) : (
        <ul className="course-management-list">
          {visible.map((course) => {
            const cover = courseCover(course, courses.indexOf(course));
            const status = courseStatus(course);
            const range = courseRange(course);
            return (
              <li key={course._id} className="ui-card course-management-item">
                <ImageSlot className="course-management-thumb" src={cover.src} tone={cover.tone} alt="" />
                <div className="course-management-list-body">
                  <p className="course-management-list-title">{course.title}</p>
                  <p className="course-management-list-meta">
                    {course.category && <span className="course-management-list-category">{course.category}</span>}
                    {(course.tags || []).map((tag) => <span key={tag} className="course-management-list-tag">#{tag}</span>)}
                  </p>
                  <p className="course-management-dates">
                    <CalendarDays size={13} aria-hidden="true" />
                    <span>{range || "ไม่ได้กำหนดวันเปิด/หมดอายุ"}</span>
                    <b className={`course-management-state is-${status.state}`}>{status.label}</b>
                  </p>
                </div>
                <div className="course-management-actions">
                  <Link to={`/courses/${course._id}`} className="ui-btn ui-btn-outline"><Eye size={15} aria-hidden="true" />ดูรายละเอียด</Link>
                  <button type="button" className="ui-btn ui-btn-outline" onClick={() => open(course)}><Pencil size={15} aria-hidden="true" />แก้ไข</button>
                  <a href={course.externalUrl} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-outline course-management-link" aria-label={`เปิดลิงก์คอร์ส ${course.title}`}><ExternalLink size={15} aria-hidden="true" /></a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <EditorDialog title={editing === "new" ? "เพิ่มคอร์สใหม่" : "แก้ไขคอร์ส"} onSave={save} onClose={() => setEditing(null)} saveDisabled={!form.title.trim() || !form.externalUrl.trim() || invalidPeriod || uploading}>
          <label className="ui-field">ชื่อคอร์ส<input type="text" value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={200} /></label>
          <label className="ui-field">ลิงก์คอร์ส (ภายนอก)<input type="url" value={form.externalUrl} onChange={(e) => set("externalUrl", e.target.value)} placeholder="https://mooc.chula.ac.th/..." required /></label>
          <div className="editor-dialog-row">
            <label className="ui-field">หมวดหมู่<input type="text" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="เช่น ทักษะอาชีพ, สุขภาพจิต" /></label>
            <label className="ui-field">แท็ก<input type="text" value={form.tagsInput} onChange={(e) => set("tagsInput", e.target.value)} placeholder="คั่นด้วยจุลภาค เช่น การสื่อสาร" /></label>
          </div>
          <div className="editor-dialog-row">
            <label className="ui-field">วันที่เปิดคอร์ส<input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></label>
            <label className="ui-field">วันที่หมดอายุ<input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => set("endDate", e.target.value)} /></label>
          </div>
          {invalidPeriod && <p className="dialog-error" role="alert">วันที่หมดอายุต้องไม่ก่อนวันที่เปิดคอร์ส</p>}
          <label className="ui-field">คำอธิบายคอร์ส<textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={5000} /></label>

          <fieldset className="course-management-cover">
            <legend>ภาพปกคอร์ส</legend>
            <p className="ui-muted">ไม่เลือกภาพจะใช้ภาพปกอัตโนมัติ เลือกจากภาพที่มีหรืออัปโหลดรูปของเอง</p>
            <div className="course-management-cover-actions">
              <button type="button" className={`ui-btn ui-btn-outline${form.coverImage ? "" : " is-selected"}`} aria-pressed={!form.coverImage} onClick={() => set("coverImage", "")}>ใช้ภาพอัตโนมัติ</button>
              <button type="button" className="ui-btn ui-btn-outline" onClick={() => coverInput.current?.click()} disabled={uploading}>
                <ImagePlus size={15} aria-hidden="true" />{uploading ? "กำลังอัปโหลด..." : "อัปโหลดรูปของเอง"}
              </button>
              <input ref={coverInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleCover} />
            </div>
            {uploadError && <p className="dialog-error" role="alert">{uploadError}</p>}
            <CoverPicker options={coverOptions} value={form.coverImage} onChange={(key) => set("coverImage", key)} label="เลือกภาพปกคอร์ส" />
          </fieldset>
        </EditorDialog>
      )}
    </div>
  );
}

export default CourseManagement;
