import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Plus, Tag } from "lucide-react";
import * as jobCategoryService from "../../services/jobCategoryService.js";
import "./JobCategories.css";

function JobCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    jobCategoryService
      .getJobCategories()
      .then(setCategories)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = await jobCategoryService.createJobCategory(name.trim());
      setCategories((prev) => [created, ...prev]);
      setName("");
    } catch (err) {
      setError(err.response?.data?.message || "เพิ่มหมวดหมู่ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="job-categories-page"><AsyncState /></div>;
  }

  return (
    <div className="job-categories-page">
      <PageHeader icon={Tag} description={<>
        หมวดหมู่ที่เพิ่มไว้ที่นี่จะปรากฏให้นายจ้างเลือกตอนสร้างประกาศงาน และใช้เป็นตัวกรองในหน้าค้นหางาน
      </>}>จัดการหมวดหมู่งาน</PageHeader>

      {error && <p className="job-categories-error">{error}</p>}

      <form className="job-categories-add-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="ชื่อหมวดหมู่ เช่น งานไอที, งานขาย"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Plus size={16} />
          <span>{saving ? "กำลังเพิ่ม..." : "เพิ่มหมวดหมู่"}</span>
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="job-categories-empty">ยังไม่มีหมวดหมู่งาน</p>
      ) : (
        <ul className="job-categories-list">
          {categories.map((category) => (
            <li key={category._id}>
              <span className="job-categories-icon">
                <Tag size={16} />
              </span>
              <span>{category.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default JobCategories;
