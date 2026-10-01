import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { CheckCircle2, ListTodo, Plus, X } from "lucide-react";
import * as activityMissionService from "../../services/activityMissionService.js";
import * as missionCategoryService from "../../services/missionCategoryService.js";
import "./ActivityMissionManagement.css";

const INITIAL_FORM = { title: "", description: "", category: "", points: 5, requiresApproval: false };

function ActivityMissionManagement() {
  const [activities, setActivities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState(null);

  useEffect(() => {
    Promise.all([
      activityMissionService.getActivityMissions(),
      missionCategoryService.getMissionCategories(),
      activityMissionService.getPendingActivityApprovals(),
    ])
      .then(([activityData, categoryData, pendingData]) => {
        setActivities(activityData);
        setCategories(categoryData);
        setPendingApprovals(pendingData);
        setForm((f) => ({ ...f, category: f.category || categoryData[0]?.key || "" }));
      })
      .catch((err) => setLoadError(err))
      .finally(() => setLoading(false));
  }, []);

  const categoryLabelByKey = Object.fromEntries(categories.map((c) => [c.key, c.label]));

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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
        requiresApproval: form.requiresApproval,
      });
      setActivities((prev) => [created, ...prev]);
      setForm((f) => ({ ...INITIAL_FORM, category: f.category }));
    } catch (err) {
      setError(err.response?.data?.message || "เพิ่มภารกิจไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(logId, approved) {
    setReviewingId(logId);
    try {
      await activityMissionService.reviewActivityLog(logId, approved);
      setPendingApprovals((prev) => prev.filter((log) => log._id !== logId));
    } finally {
      setReviewingId(null);
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
              {categories.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
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
        <label className="activity-mission-management-approval-toggle">
          <input type="checkbox" name="requiresApproval" checked={form.requiresApproval} onChange={handleChange} />
          <span>ต้องให้เจ้าหน้าที่อนุมัติก่อนจึงจะได้รับแต้ม</span>
        </label>

        {error && <p className="activity-mission-management-error">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "กำลังเพิ่ม..." : "เพิ่มภารกิจ"}
        </button>
      </form>

      {pendingApprovals.length > 0 && (
        <>
          <h2 className="activity-mission-management-list-heading">รอการอนุมัติ ({pendingApprovals.length})</h2>
          <ul className="activity-mission-management-list">
            {pendingApprovals.map((log) => (
              <li key={log._id}>
                <div className="activity-mission-management-list-body">
                  <p className="activity-mission-management-list-title">
                    {log.user?.name} — {log.activityMission?.title}
                  </p>
                  <p className="activity-mission-management-list-meta">
                    <span className="activity-mission-management-list-category">{categoryLabelByKey[log.category] || log.category}</span>
                    <span className="activity-mission-management-list-points">+{log.pointsAwarded} แต้ม</span>
                    {log.note && <span>บันทึก: {log.note}</span>}
                  </p>
                </div>
                <div className="activity-mission-management-review-actions">
                  <button
                    type="button"
                    className="activity-mission-management-approve"
                    onClick={() => handleReview(log._id, true)}
                    disabled={reviewingId === log._id}
                    title="อนุมัติ"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                  <button
                    type="button"
                    className="activity-mission-management-reject"
                    onClick={() => handleReview(log._id, false)}
                    disabled={reviewingId === log._id}
                    title="ไม่อนุมัติ"
                  >
                    <X size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

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
                  <span className="activity-mission-management-list-category">{categoryLabelByKey[activity.category] || activity.category}</span>
                  <span className="activity-mission-management-list-points">+{activity.points} แต้ม</span>
                  {activity.requiresApproval && <span>ต้องอนุมัติ</span>}
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
