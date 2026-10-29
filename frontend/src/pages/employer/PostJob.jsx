import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Briefcase, Check, ImagePlus, Trash2 } from "lucide-react";
import * as jobService from "../../services/jobService.js";
import * as skillService from "../../services/skillService.js";
import * as jobCategoryService from "../../services/jobCategoryService.js";
import SkillPicker from "../../components/profile/SkillPicker.jsx";
import VerifyBanner from "../../components/employer/VerifyBanner.jsx";
import { ATTACHMENT_TYPES } from "../../constants/attachmentTypes.js";
import { toDateInputValue } from "../../utils/courseDates.js";
import "./PostJob.css";

const INITIAL_FORM = {
  title: "",
  description: "",
  location: "",
  salary: "",
  externalUrl: "",
  expiredAt: "",
  category: "",
};

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

// สร้างประกาศใหม่ หรือแก้ไขประกาศที่มีอยู่เมื่อ route มี :jobId
function PostJob() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const editing = Boolean(jobId);
  const [allSkills, setAllSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const imageInput = useRef(null);

  useEffect(() => {
    skillService.getSkills().then(setAllSkills).catch(() => setAllSkills([])).finally(() => setSkillsLoading(false));
    jobCategoryService.getJobCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!editing) return;
    jobService
      .getMyJob(jobId)
      .then((job) => {
        if (!job || Array.isArray(job)) throw new Error("not found");
        setForm({
          title: job.title || "",
          description: job.description || "",
          location: job.location || "",
          salary: job.salary ?? "",
          externalUrl: job.externalUrl || "",
          expiredAt: toDateInputValue(job.expiredAt),
          category: job.category?._id || "",
        });
        setSelectedSkills((job.skills || []).map((skill) => skill._id));
        setSelectedAttachments(job.attachmentRequests || []);
        setExistingImage(job.imageUrl || null);
      })
      .catch((err) => setLoadError(err))
      .finally(() => setLoading(false));
  }, [editing, jobId]);

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleSkill(skill) {
    setSelectedSkills((prev) => (prev.includes(skill._id) ? prev.filter((id) => id !== skill._id) : [...prev, skill._id]));
  }

  function toggleAttachment(name) {
    setSelectedAttachments((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));
  }

  function handleImage(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError("รูปต้องมีขนาดไม่เกิน 3 MB");
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (existingImage) setRemoveImage(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        salary: form.salary === "" ? "" : Number(form.salary),
        skills: selectedSkills,
        attachmentRequests: selectedAttachments,
      };
      const saved = editing ? await jobService.updateJob(jobId, payload) : await jobService.createJob(payload);
      // ประกาศถูกบันทึกแล้ว ถ้ารูปล้มเหลวต้องไม่ค้างอยู่หน้าฟอร์ม (กดส่งซ้ำจะได้ประกาศซ้ำ) จึงไปหน้าประกาศพร้อมคำเตือน
      let imageNotice = null;
      try {
        if (imageFile) await jobService.uploadJobImage(saved._id, imageFile);
        else if (removeImage) await jobService.removeJobImage(saved._id);
      } catch {
        imageNotice = "บันทึกประกาศงานแล้ว แต่บันทึกรูปไม่สำเร็จ กด “แก้ไขประกาศ” เพื่อลองใส่รูปอีกครั้ง";
      }
      navigate(`/employer/jobs/${saved._id}`, { state: imageNotice ? { notice: imageNotice } : undefined });
    } catch (err) {
      setError(err.response?.data?.message || (editing ? "บันทึกประกาศงานไม่สำเร็จ" : "สร้างประกาศงานไม่สำเร็จ"));
    } finally {
      setSubmitting(false);
    }
  }

  const header = (
    <PageHeader
      icon={Briefcase}
      eyebrow="Employer space"
      description={editing ? "แก้ไขรายละเอียด รูป และทักษะที่ต้องการ" : "กรอกรายละเอียดตำแหน่งงาน เพิ่มรูปบริษัท และเลือกทักษะที่ต้องการ"}
      backTo={editing ? `/employer/jobs/${jobId}` : "/employer/jobs"}
      backLabel={editing ? "รายละเอียดประกาศงาน" : "ประกาศงานของฉัน"}
    >{editing ? "แก้ไขประกาศงาน" : "สร้างประกาศงาน"}</PageHeader>
  );

  if (loadError) return <div className="post-job-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;
  if (loading) return <div className="post-job-page">{header}<AsyncState /></div>;

  const shownImage = imagePreview || (!removeImage ? existingImage : null);

  return (
    <div className="post-job-page">
      {header}
      <VerifyBanner />

      <form className="post-job-form" onSubmit={handleSubmit}>
        {error && <p className="post-job-error" role="alert">{error}</p>}

        <div className="post-job-columns">
          <div className="post-job-col">
            <section className="ui-card post-job-card">
              <div className="ui-card-head"><h2>ข้อมูลตำแหน่งงาน</h2></div>
              <div className="post-job-fields">
                <label className="ui-field">
                  ตำแหน่งงาน
                  <input type="text" name="title" value={form.title} onChange={handleChange} required />
                </label>
                <label className="ui-field">
                  ประเภทงาน
                  <select name="category" value={form.category} onChange={handleChange} required>
                    <option value="">เลือกประเภทงาน</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <label className="ui-field">
                  รายละเอียดงาน
                  <textarea name="description" value={form.description} onChange={handleChange} rows={12} placeholder={"อธิบายงานคร่าว ๆ 1-2 บรรทัด แล้วแยกเป็นหัวข้อ เช่น\n\nหน้าที่หลัก:\n- ต้อนรับและเสิร์ฟอาหารลูกค้า\n\nคุณสมบัติและสิ่งที่ต้องทำได้:\n- ยืนทำงานต่อเนื่อง 8 ชั่วโมงได้\n\nสวัสดิการและเงื่อนไข:\n- ประกันสังคม หยุดสัปดาห์ละ 1 วัน"} />
                  <small>พิมพ์หัวข้อให้ลงท้ายด้วย : แล้วขึ้นต้นแต่ละข้อด้วย - ระบบจะแสดงเป็นรายการให้ผู้สมัครอ่านง่าย</small>
                </label>
                <div className="post-job-row">
                  <label className="ui-field">
                    สถานที่ทำงาน
                    <input type="text" name="location" value={form.location} onChange={handleChange} />
                  </label>
                  <label className="ui-field">
                    เงินเดือน (บาท)
                    <input type="number" name="salary" value={form.salary} onChange={handleChange} min={0} />
                  </label>
                </div>
                <div className="post-job-row">
                  <label className="ui-field">
                    ลิงก์ประกาศต้นฉบับ (ถ้ามี)
                    <input type="url" name="externalUrl" value={form.externalUrl} onChange={handleChange} placeholder="https://" />
                  </label>
                  <label className="ui-field">
                    วันหมดอายุประกาศ
                    <input type="date" name="expiredAt" value={form.expiredAt} onChange={handleChange} />
                  </label>
                </div>
              </div>
            </section>

            <section className="ui-card post-job-card">
              <div className="ui-card-head">
                <div>
                  <h2>เอกสารที่ต้องการให้ผู้สมัครแนบ</h2>
                  <p>นอกเหนือจากโปรไฟล์ของผู้สมัคร</p>
                </div>
              </div>
              <div className="ui-choice-grid" role="group" aria-label="เอกสารที่ต้องการ">
                {ATTACHMENT_TYPES.map((name) => (
                  <label key={name} className="ui-choice">
                    <input type="checkbox" checked={selectedAttachments.includes(name)} onChange={() => toggleAttachment(name)} />
                    <span className="ui-choice-mark" aria-hidden="true"><Check size={13} /></span>
                    <span className="ui-choice-text">{name}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <div className="post-job-col">
            <section className="ui-card post-job-card">
              <div className="ui-card-head">
                <div>
                  <h2>รูปภาพประกาศ</h2>
                  <p>รูปบริษัทหรือสถานที่ทำงาน (JPG, PNG, WebP ไม่เกิน 3 MB)</p>
                </div>
              </div>
              <div className={`post-job-image${shownImage ? " has-image" : ""}`}>
                {shownImage ? <img src={shownImage} alt="ตัวอย่างรูปประกาศงาน" /> : <span><ImagePlus size={28} aria-hidden="true" />ยังไม่มีรูป</span>}
              </div>
              <div className="post-job-image-actions">
                <button type="button" className="ui-btn ui-btn-outline" onClick={() => imageInput.current?.click()}>
                  <ImagePlus size={15} aria-hidden="true" />{shownImage ? "เปลี่ยนรูป" : "เลือกรูป"}
                </button>
                {shownImage && (
                  <button type="button" className="ui-btn ui-btn-outline post-job-remove" onClick={clearImage}>
                    <Trash2 size={15} aria-hidden="true" />ลบรูป
                  </button>
                )}
                <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleImage} />
              </div>
            </section>

            <section className="ui-card post-job-card">
              <div className="ui-card-head">
                <div>
                  <h2>ทักษะที่ต้องการ</h2>
                  <p>เลือกแล้ว {selectedSkills.length} ทักษะ — ใช้จับคู่กับทักษะของผู้สมัคร</p>
                </div>
              </div>
              <SkillPicker skills={allSkills} selectedIds={selectedSkills} onToggle={toggleSkill} loading={skillsLoading} />
            </section>
          </div>
        </div>

        <div className="post-job-submit-bar">
          <p className="post-job-note">
            {editing ? "ถ้าประกาศนี้เคยถูกปฏิเสธ การบันทึกจะส่งให้ผู้ดูแลระบบตรวจสอบใหม่" : "ประกาศงานจะเผยแพร่ต่อสาธารณะหลังผู้ดูแลระบบยืนยันแล้ว"}
          </p>
          <button type="submit" className="ui-btn ui-btn-primary post-job-submit" disabled={submitting}>
            {submitting ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : "สร้างประกาศงาน"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PostJob;
