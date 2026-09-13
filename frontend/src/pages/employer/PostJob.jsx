import PageHeader from "../../components/common/PageHeader.jsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase } from "lucide-react";
import * as jobService from "../../services/jobService.js";
import * as skillService from "../../services/skillService.js";
import * as jobCategoryService from "../../services/jobCategoryService.js";
import { ATTACHMENT_TYPES } from "../../constants/attachmentTypes.js";
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

function PostJob() {
  const navigate = useNavigate();
  const [allSkills, setAllSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    skillService.getSkills().then(setAllSkills);
    jobCategoryService.getJobCategories().then(setCategories);
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleSkill(skillId) {
    setSelectedSkills((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  }

  function toggleAttachment(name) {
    setSelectedAttachments((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        salary: form.salary ? Number(form.salary) : undefined,
        skills: selectedSkills,
        attachmentRequests: selectedAttachments,
      };
      await jobService.createJob(payload);
      navigate("/employer/jobs");
    } catch (err) {
      setError(err.response?.data?.message || "สร้างประกาศงานไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="post-job-page">
      <PageHeader icon={Briefcase} backTo="/employer/jobs" backLabel="ประกาศงานของฉัน">สร้างประกาศงาน</PageHeader>

      <form className="post-job-form" onSubmit={handleSubmit}>
        {error && <p className="post-job-error">{error}</p>}

        <label>
          ตำแหน่งงาน
          <input type="text" name="title" value={form.title} onChange={handleChange} required />
        </label>
        <label>
          ประเภทงาน
          <select name="category" value={form.category} onChange={handleChange} required>
            <option value="">เลือกประเภทงาน</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          รายละเอียดงาน
          <textarea name="description" value={form.description} onChange={handleChange} rows={4} />
        </label>
        <label>
          สถานที่ทำงาน
          <input type="text" name="location" value={form.location} onChange={handleChange} />
        </label>
        <label>
          เงินเดือน (บาท)
          <input type="number" name="salary" value={form.salary} onChange={handleChange} min={0} />
        </label>
        <label>
          ลิงก์ประกาศต้นฉบับ (ถ้ามี)
          <input type="url" name="externalUrl" value={form.externalUrl} onChange={handleChange} />
        </label>
        <label>
          วันหมดอายุประกาศ
          <input type="date" name="expiredAt" value={form.expiredAt} onChange={handleChange} />
        </label>

        <fieldset className="post-job-skills">
          <legend>ทักษะที่ต้องการ</legend>
          {allSkills.map((skill) => (
            <label key={skill._id} className="post-job-skill-option">
              <input
                type="checkbox"
                checked={selectedSkills.includes(skill._id)}
                onChange={() => toggleSkill(skill._id)}
              />
              {skill.skillName}
            </label>
          ))}
        </fieldset>

        <fieldset className="post-job-skills">
          <legend>เอกสารเพิ่มเติมที่ต้องการให้ผู้สมัครแนบ (นอกเหนือจากโปรไฟล์)</legend>
          {ATTACHMENT_TYPES.map((name) => (
            <label key={name} className="post-job-skill-option">
              <input
                type="checkbox"
                checked={selectedAttachments.includes(name)}
                onChange={() => toggleAttachment(name)}
              />
              {name}
            </label>
          ))}
        </fieldset>

        <button type="submit" className="btn btn-primary post-job-submit" disabled={submitting}>
          {submitting ? "กำลังบันทึก..." : "สร้างประกาศงาน"}
        </button>
        <p className="post-job-note">ประกาศงานจะเผยแพร่ต่อสาธารณะหลังผู้ดูแลระบบยืนยันแล้ว</p>
      </form>
    </div>
  );
}

export default PostJob;
