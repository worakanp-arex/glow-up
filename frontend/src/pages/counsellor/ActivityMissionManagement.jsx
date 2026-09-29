import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { ListTodo, Plus } from "lucide-react";
import * as activityMissionService from "../../services/activityMissionService.js";
import "./ActivityMissionManagement.css";

const CATEGORY_LABELS = {
  routine: "งานบ้าน / กิจวัตร",
  physical: "ออกกำลังกาย",
  learning: "การเรียนรู้",
  self_awareness: "ตระหนักรู้ตนเอง",
  coping: "ทักษะรับมือ",
  self_monitoring: "การติดตามตนเอง",
  social: "สังคม / ความสัมพันธ์",
  mindfulness: "จิตใจ / สติ",
};
const INITIAL_FORM = { title: "", description: "", category: "routine", points: 5 };

function ActivityMissionManagement() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    activityMissionService
      .getActivityMissions()
      .then(setActivities)
      .catch((err) => setLoadError(err))
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
      const created = await activityMissionService.createActivityMission({
        title: form.title,
        description: form.description,
        category: form.category,
        points: Number(form.points),
      });
      setActivities((prev) => [created, ...prev]);
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err.response?.data?.message || "เพิ่มภารกิจไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="activity-mission-management-page">
      <PageHeader
        icon={ListTodo}
        description="เพิ่มภารกิจประจำวันที่ผู้บำบัดเลือกทำเองได้ เช่น งานบ้าน ออกกำลังกาย และการเรียนรู้ พร้อมกำหนดแต้มรางวัลต่อครั้ง"
      >
        จัดการภารกิจประจำวัน
      </PageHeader>

      <form className="activity-mission-management-form" onSubmit={handleSubmit}>
        <h2>
          <Plus size={16} />
          <span>เพิ่มภารกิจใหม่</span>
        </h2>
        <div className="activity-mission-management-form-grid">
          <label>
            ชื่อภารกิจ
            <input type="text" name="title" value={form.title} onChange={handleChange} required />
          </label>
          <label>
            หมวดหมู่
            <select name="category" value={form.category} onChange={handleChange}>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            แต้มรางวัลต่อครั้ง
            <input type="number" name="points" min={0} value={form.points} onChange={handleChange} />
          </label>
        </div>
        <label className="activity-mission-management-description-field">
          คำอธิบายภารกิจ
          <textarea name="description" value={form.description} onChange={handleChange} rows={2} />
        </label>

        {error && <p className="activity-mission-management-error">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "กำลังเพิ่ม..." : "เพิ่มภารกิจ"}
        </button>
      </form>

      <h2 className="activity-mission-management-list-heading">ภารกิจทั้งหมด</h2>
      {loading ? (
        <AsyncState />
      ) : activities.length === 0 ? (
        <p className="activity-mission-management-empty">ยังไม่มีภารกิจในระบบ</p>
      ) : (
        <ul className="activity-mission-management-list">
          {activities.map((activity) => (
            <li key={activity._id}>
              <div className="activity-mission-management-list-body">
                <p className="activity-mission-management-list-title">{activity.title}</p>
                <p className="activity-mission-management-list-meta">
                  <span className="activity-mission-management-list-category">{CATEGORY_LABELS[activity.category]}</span>
                  <span className="activity-mission-management-list-points">+{activity.points} แต้ม</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ActivityMissionManagement;
