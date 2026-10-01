import { useEffect, useState } from "react";
import { CheckCircle2, Clock, ListTodo, XCircle } from "lucide-react";
import * as activityMissionService from "../../services/activityMissionService.js";
import * as missionCategoryService from "../../services/missionCategoryService.js";
import { resolveIcon } from "../../utils/lucideIcon.js";
import "./ActivityMissionBoard.css";

function ActivityItem({ item, onLog }) {
  const { activity, loggedToday, approvalStatus } = item;
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({ durationMinutes: "", distanceKm: "", fatigueLevel: 3, enjoymentLevel: 3, note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload =
        activity.category === "physical"
          ? {
              durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
              distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined,
              fatigueLevel: Number(form.fatigueLevel),
              enjoymentLevel: Number(form.enjoymentLevel),
              note: form.note || undefined,
            }
          : { note: form.note || undefined };
      await onLog(activity._id, payload);
      setExpanded(false);
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className={`activity-mission-item${loggedToday ? " done" : ""}`}>
      <div className="activity-mission-item-main">
        <div className="activity-mission-item-info">
          <span className="activity-mission-item-title">{activity.title}</span>
          {activity.description && <span className="activity-mission-item-desc">{activity.description}</span>}
        </div>
        <span className="activity-mission-item-points">+{activity.points} แต้ม</span>
        {loggedToday ? (
          approvalStatus === "pending" ? (
            <span className="activity-mission-item-pending">
              <Clock size={16} />
              <span>รอการอนุมัติ</span>
            </span>
          ) : approvalStatus === "rejected" ? (
            <span className="activity-mission-item-rejected">
              <XCircle size={16} />
              <span>ไม่ได้รับการอนุมัติ</span>
            </span>
          ) : (
            <span className="activity-mission-item-done">
              <CheckCircle2 size={16} />
              <span>ทำแล้ววันนี้</span>
            </span>
          )
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => setExpanded((v) => !v)}>
            บันทึกว่าทำแล้ว
          </button>
        )}
      </div>

      {expanded && !loggedToday && (
        <form className="activity-mission-log-form" onSubmit={handleSubmit}>
          {activity.category === "physical" && (
            <div className="activity-mission-log-row">
              <label>
                ระยะเวลา (นาที)
                <input type="number" name="durationMinutes" min={0} value={form.durationMinutes} onChange={handleChange} />
              </label>
              <label>
                ระยะทาง (กม., ถ้ามี)
                <input type="number" name="distanceKm" min={0} step="0.1" value={form.distanceKm} onChange={handleChange} />
              </label>
              <label>
                ระดับความเหนื่อย
                <input type="range" name="fatigueLevel" min={1} max={5} value={form.fatigueLevel} onChange={handleChange} />
              </label>
              <label>
                ความสนุกกับกิจกรรม
                <input type="range" name="enjoymentLevel" min={1} max={5} value={form.enjoymentLevel} onChange={handleChange} />
              </label>
            </div>
          )}
          <label className="activity-mission-log-note">
            บันทึกเพิ่มเติม (ถ้ามี)
            <input type="text" name="note" value={form.note} onChange={handleChange} />
          </label>
          {error && <p className="activity-mission-log-error">{error}</p>}
          <div className="activity-mission-log-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : "ยืนยัน"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setExpanded(false)}>
              ยกเลิก
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

function ActivityMissionBoard({ onLogged, embedded = false }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([activityMissionService.getMyTodayActivities(), missionCategoryService.getMissionCategories()])
      .then(([itemsData, categoryData]) => {
        setItems(itemsData);
        setCategories(categoryData);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  async function handleLog(activityId, payload) {
    const { log } = await activityMissionService.logActivity(activityId, payload);
    setItems((prev) =>
      prev.map((item) =>
        item.activity._id === activityId
          ? { ...item, loggedToday: true, approvalStatus: log.requiresApproval ? "pending" : null }
          : item
      )
    );
    onLogged?.();
  }

  if (loading) return <p className="activity-mission-board-loading">กำลังโหลดภารกิจวันนี้...</p>;
  if (error) return <p role="alert">โหลดภารกิจไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  if (items.length === 0) return null;

  const byCategory = categories
    .map((cat) => ({
      category: cat,
      items: items.filter((item) => item.activity.category === cat.key),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className={`activity-mission-board${embedded ? " embedded" : ""}`}>
      {!embedded && (
        <h2>
          <ListTodo size={18} />
          <span>ภารกิจวันนี้</span>
        </h2>
      )}
      {byCategory.map(({ category, items: groupItems }) => {
        const Icon = resolveIcon(category.icon);
        return (
          <div key={category.key} className="activity-mission-group">
            <h3>
              <Icon size={16} />
              <span>{category.label}</span>
            </h3>
            <ul className="activity-mission-list">
              {groupItems.map((item) => (
                <ActivityItem key={item.activity._id} item={item} onLog={handleLog} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default ActivityMissionBoard;
