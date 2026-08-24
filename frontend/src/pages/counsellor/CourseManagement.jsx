import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, Plus } from "lucide-react";
import * as courseService from "../../services/courseService.js";
import "./CourseManagement.css";

const INITIAL_FORM = { title: "", description: "", category: "", externalUrl: "", tagsInput: "" };

function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    courseService
      .getCourses()
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const tags = form.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const created = await courseService.createCourse({
        title: form.title,
        description: form.description,
        category: form.category,
        externalUrl: form.externalUrl,
        tags,
      });
      setCourses((prev) => [created, ...prev]);
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err.response?.data?.message || "เพิ่มคอร์สไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="course-management-page">
      <h1>
        <BookOpen size={22} />
        <span>จัดการคอร์สเรียน</span>
      </h1>
      <p className="course-management-intro">
        เพิ่มคอร์สเรียนจากแหล่งภายนอก (เช่น Chula MOOC) พร้อมคำอธิบาย แท็ก และหมวดหมู่ ให้ผู้ผ่านการบำบัดค้นหาและเรียนรู้ได้
      </p>

      <form className="course-management-form" onSubmit={handleSubmit}>
        <h2>
          <Plus size={16} />
          <span>เพิ่มคอร์สใหม่</span>
        </h2>
        <div className="course-management-form-grid">
          <label>
            ชื่อคอร์ส
            <input type="text" name="title" value={form.title} onChange={handleChange} required />
          </label>
          <label>
            ลิงก์คอร์ส (ภายนอก)
            <input
              type="url"
              name="externalUrl"
              value={form.externalUrl}
              onChange={handleChange}
              placeholder="https://mooc.chula.ac.th/..."
              required
            />
          </label>
          <label>
            หมวดหมู่
            <input
              type="text"
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="เช่น ทักษะอาชีพ, สุขภาพจิต"
            />
          </label>
          <label>
            แท็ก
            <input
              type="text"
              name="tagsInput"
              value={form.tagsInput}
              onChange={handleChange}
              placeholder="คั่นด้วยจุลภาค เช่น การสื่อสาร, ทักษะพื้นฐาน"
            />
          </label>
        </div>
        <label className="course-management-description-field">
          คำอธิบายคอร์ส
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
        </label>

        {error && <p className="course-management-error">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "กำลังเพิ่ม..." : "เพิ่มคอร์ส"}
        </button>
      </form>

      <h2 className="course-management-list-heading">คอร์สเรียนทั้งหมด</h2>
      {loading ? (
        <p>กำลังโหลด...</p>
      ) : courses.length === 0 ? (
        <p className="course-management-empty">ยังไม่มีคอร์สเรียนในระบบ</p>
      ) : (
        <ul className="course-management-list">
          {courses.map((course) => (
            <li key={course._id}>
              <div className="course-management-list-body">
                <p className="course-management-list-title">{course.title}</p>
                <p className="course-management-list-meta">
                  {course.category && <span className="course-management-list-category">{course.category}</span>}
                  {(course.tags || []).map((tag) => (
                    <span key={tag} className="course-management-list-tag">
                      #{tag}
                    </span>
                  ))}
                </p>
              </div>
              <a href={course.externalUrl} target="_blank" rel="noopener noreferrer" className="course-management-list-link">
                <ExternalLink size={14} />
                เปิดลิงก์
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CourseManagement;
