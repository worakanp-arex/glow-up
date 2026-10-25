import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import EditorDialog from "../../components/common/EditorDialog.jsx";
import useConfirmDialog from "../../components/common/useConfirmDialog.jsx";
import { useEffect, useState } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import * as jobCategoryService from "../../services/jobCategoryService.js";
import "./JobCategories.css";

function JobCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const { confirm, confirmDialog } = useConfirmDialog();

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

  function startEdit(category) {
    setEditName(category.name);
    setEditing(category);
  }

  async function saveEdit() {
    const updated = await jobCategoryService.updateJobCategory(editing._id, editName.trim());
    setCategories((prev) => prev.map((category) => (category._id === updated._id ? updated : category)));
  }

  function handleDelete(category) {
    confirm({
      title: "ลบหมวดหมู่งาน",
      message: `ต้องการลบหมวดหมู่ "${category.name}" ใช่ไหม? ถ้ายังมีประกาศงานที่ใช้หมวดนี้อยู่ ระบบจะไม่อนุญาตให้ลบ`,
      confirmLabel: "ลบหมวดหมู่",
      errorMessage: "ลบหมวดหมู่ไม่สำเร็จ",
      onConfirm: async () => {
        await jobCategoryService.deleteJobCategory(category._id);
        setCategories((prev) => prev.filter((item) => item._id !== category._id));
      },
    });
  }

  const header = (
    <PageHeader icon={Tag} eyebrow="Admin" description={<>
      หมวดหมู่ที่เพิ่มไว้ที่นี่จะปรากฏให้นายจ้างเลือกตอนสร้างประกาศงาน และใช้เป็นตัวกรองในหน้าค้นหางาน
    </>}>จัดการหมวดหมู่งาน</PageHeader>
  );

  if (loadError) return <div className="job-categories-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;
  if (loading) return <div className="job-categories-page">{header}<AsyncState /></div>;

  return (
    <div className="job-categories-page">
      {confirmDialog}
      {header}

      {error && <p className="job-categories-error">{error}</p>}

      <form className="job-categories-add-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="ชื่อหมวดหมู่ เช่น งานไอที, งานขาย"
          aria-label="ชื่อหมวดหมู่ใหม่"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>
          <Plus size={16} />
          <span>{saving ? "กำลังเพิ่ม..." : "เพิ่มหมวดหมู่"}</span>
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="job-categories-empty">ยังไม่มีหมวดหมู่งาน</p>
      ) : (
        <ul className="job-categories-list">
          {categories.map((category) => (
            <li key={category._id} className="ui-card">
              <span className="job-categories-icon">
                <Tag size={16} />
              </span>
              <span className="job-categories-name">{category.name}</span>
              <div className="job-categories-actions">
                <button type="button" onClick={() => startEdit(category)} title="แก้ไข" aria-label={`แก้ไข ${category.name}`}><Pencil size={16} /></button>
                <button type="button" className="is-danger" onClick={() => handleDelete(category)} title="ลบ" aria-label={`ลบ ${category.name}`}><Trash2 size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditorDialog title="แก้ไขหมวดหมู่งาน" onSave={saveEdit} onClose={() => setEditing(null)} saveDisabled={!editName.trim()}>
          <label className="ui-field">ชื่อหมวดหมู่<input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} autoFocus /></label>
        </EditorDialog>
      )}
    </div>
  );
}

export default JobCategories;
