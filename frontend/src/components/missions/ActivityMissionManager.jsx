import AsyncState from "../common/AsyncState.jsx";
import EditorDialog from "../common/EditorDialog.jsx";
import IconPicker from "../common/IconPicker.jsx";
import useConfirmDialog from "../common/useConfirmDialog.jsx";
import useReasonDialog from "../common/useReasonDialog.jsx";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Pencil, Plus, Power, Trash2, X } from "lucide-react";
import * as activityMissionService from "../../services/activityMissionService.js";
import * as missionCategoryService from "../../services/missionCategoryService.js";
import { resolveIcon } from "../../utils/lucideIcon.js";
import { formatCourseDate, toDateInputValue } from "../../utils/courseDates.js";
import "./ActivityMissionManager.css";

const EMPTY_FORM = { title: "", description: "", category: "", icon: "", points: 5, requiresApproval: false, active: true, startDate: "", endDate: "" };

const FILTERS = [
  { key: "current", label: "ใช้งานอยู่" },
  { key: "ended", label: "หมดช่วงเวลา" },
  { key: "inactive", label: "ปิดใช้งาน" },
  { key: "all", label: "ทั้งหมด" },
];

// Where the mission stands: switched off, not started, running, or past its end date.
function missionState(activity, now = new Date()) {
  if (!activity.active) return { key: "inactive", label: "ปิดใช้งาน" };
  if (activity.startDate && new Date(activity.startDate) > now) return { key: "upcoming", label: "ยังไม่เริ่ม" };
  if (activity.endDate && new Date(activity.endDate) < now) return { key: "ended", label: "หมดช่วงเวลา" };
  return { key: "current", label: "ใช้งานอยู่" };
}

function period(activity) {
  if (!activity.startDate && !activity.endDate) return "ไม่จำกัดช่วงเวลา";
  return [activity.startDate && `เริ่ม ${formatCourseDate(activity.startDate)}`, activity.endDate && `สิ้นสุด ${formatCourseDate(activity.endDate)}`].filter(Boolean).join(" · ");
}

// Create, edit, switch off and delete daily missions, and review the logs that
// need approval. Used by both counsellors and admins.
export default function ActivityMissionManager() {
  const [activities, setActivities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState("current");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [notice, setNotice] = useState("");
  const [reviewingId, setReviewingId] = useState(null);
  const { confirm, confirmDialog } = useConfirmDialog();
  const { askReason, reasonDialog } = useReasonDialog();

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
      })
      .catch((err) => setLoadError(err))
      .finally(() => setLoading(false));
  }, []);

  const categoryByKey = useMemo(() => Object.fromEntries(categories.map((c) => [c.key, c])), [categories]);
  const visible = activities.filter((activity) => {
    const state = missionState(activity).key;
    return filter === "all" ? true : filter === "current" ? state === "current" || state === "upcoming" : state === filter;
  });

  function openCreate() {
    setForm({ ...EMPTY_FORM, category: categories[0]?.key || "" });
    setEditing("new");
  }

  function openEdit(activity) {
    setForm({
      title: activity.title,
      description: activity.description || "",
      category: activity.category,
      icon: activity.icon || "",
      points: activity.points ?? 0,
      requiresApproval: Boolean(activity.requiresApproval),
      active: activity.active !== false,
      startDate: toDateInputValue(activity.startDate),
      endDate: toDateInputValue(activity.endDate),
    });
    setEditing(activity);
  }

  function set(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const invalidPeriod = form.startDate && form.endDate && form.endDate < form.startDate;

  async function save() {
    const payload = { ...form, points: Number(form.points) };
    if (editing === "new") {
      const created = await activityMissionService.createActivityMission(payload);
      setActivities((prev) => [created, ...prev]);
    } else {
      const updated = await activityMissionService.updateActivityMission(editing._id, payload);
      setActivities((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    }
  }

  async function toggleActive(activity) {
    const updated = await activityMissionService.updateActivityMission(activity._id, { active: !activity.active });
    setActivities((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
  }

  function requestDelete(activity) {
    confirm({
      title: "ลบภารกิจประจำวัน",
      message: `ต้องการลบภารกิจ "${activity.title}" ใช่ไหม? ถ้ามีผู้ใช้งานเคยทำภารกิจนี้แล้ว ระบบจะซ่อนภารกิจแทนการลบ เพื่อไม่ให้แต้มที่เคยได้รับหายไป`,
      confirmLabel: "ลบภารกิจ",
      onConfirm: async () => {
        const result = await activityMissionService.deleteActivityMission(activity._id);
        if (result?.archived) {
          setActivities((prev) => prev.map((item) => (item._id === activity._id ? result.activityMission : item)));
          setNotice(`ภารกิจ "${activity.title}" มีผู้ใช้งานทำไปแล้ว ${result.logCount} ครั้ง จึงถูกปิดใช้งานแทนการลบ`);
        } else {
          setActivities((prev) => prev.filter((item) => item._id !== activity._id));
          setNotice(`ลบภารกิจ "${activity.title}" แล้ว`);
        }
      },
    });
  }

  async function approve(logId) {
    setReviewingId(logId);
    try {
      await activityMissionService.reviewActivityLog(logId, true);
      setPendingApprovals((prev) => prev.filter((log) => log._id !== logId));
    } finally {
      setReviewingId(null);
    }
  }

  function reject(log) {
    askReason({
      title: "ไม่อนุมัติภารกิจนี้",
      description: `${log.user?.name} จะได้รับแจ้งว่าภารกิจ "${log.activityMission?.title}" ไม่ได้รับการอนุมัติ`,
      label: "เหตุผลที่ไม่อนุมัติ",
      required: false,
      confirmLabel: "ไม่อนุมัติ",
      onConfirm: async (note) => {
        await activityMissionService.reviewActivityLog(log._id, false, note);
        setPendingApprovals((prev) => prev.filter((item) => item._id !== log._id));
      },
    });
  }

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  return (
    <div className="activity-manager">
      {confirmDialog}
      {reasonDialog}

      {pendingApprovals.length > 0 && (
        <section className="ui-card activity-manager-pending">
          <div className="ui-card-head"><h2>รอการอนุมัติ ({pendingApprovals.length})</h2></div>
          <ul>
            {pendingApprovals.map((log) => (
              <li key={log._id}>
                <div>
                  <strong>{log.user?.name} — {log.activityMission?.title}</strong>
                  <small>{categoryByKey[log.category]?.label || log.category} · +{log.pointsAwarded} แต้ม{log.note && ` · บันทึก: ${log.note}`}</small>
                </div>
                <div className="activity-manager-review">
                  <button type="button" className="ui-btn ui-btn-outline" onClick={() => approve(log._id)} disabled={reviewingId === log._id}><CheckCircle2 size={15} aria-hidden="true" />อนุมัติ</button>
                  <button type="button" className="ui-btn ui-btn-outline activity-manager-danger" onClick={() => reject(log)} disabled={reviewingId === log._id}><X size={15} aria-hidden="true" />ไม่อนุมัติ</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="activity-manager-toolbar">
        <div className="ui-tabs" role="tablist" aria-label="กรองภารกิจ">
          {FILTERS.map((item) => (
            <button key={item.key} type="button" role="tab" aria-selected={filter === item.key} className="ui-tab" onClick={() => setFilter(item.key)}>{item.label}</button>
          ))}
        </div>
        <button type="button" className="ui-btn ui-btn-primary" onClick={openCreate} disabled={categories.length === 0}><Plus size={16} aria-hidden="true" />เพิ่มภารกิจ</button>
      </div>

      {notice && <p className="activity-manager-notice" role="status">{notice}</p>}

      {loading ? <AsyncState /> : visible.length === 0 ? (
        <p className="activity-manager-empty">{activities.length === 0 ? "ยังไม่มีภารกิจในระบบ" : "ไม่มีภารกิจในหมวดนี้"}</p>
      ) : (
        <ul className="activity-manager-list">
          {visible.map((activity) => {
            const state = missionState(activity);
            const Icon = resolveIcon(activity.icon || categoryByKey[activity.category]?.icon);
            return (
              <li key={activity._id} className={`ui-card activity-manager-item is-${state.key}`}>
                <span className="activity-manager-icon" aria-hidden="true"><Icon size={22} /></span>
                <div className="activity-manager-body">
                  <p className="activity-manager-title">{activity.title}</p>
                  {activity.description && <p className="activity-manager-desc">{activity.description}</p>}
                  <p className="activity-manager-meta">
                    <span className="ui-chip">{categoryByKey[activity.category]?.label || activity.category}</span>
                    <span className="ui-chip ui-chip-peach">+{activity.points} แต้ม</span>
                    {activity.requiresApproval && <span className="ui-chip ui-chip-lilac">ต้องอนุมัติ</span>}
                    <span className="ui-chip ui-chip-neutral"><CalendarDays size={12} aria-hidden="true" />{period(activity)}</span>
                    <span className={`activity-manager-state is-${state.key}`}>{state.label}</span>
                  </p>
                </div>
                <div className="activity-manager-actions">
                  <button type="button" onClick={() => openEdit(activity)} title="แก้ไข" aria-label={`แก้ไข ${activity.title}`}><Pencil size={16} /></button>
                  <button type="button" onClick={() => toggleActive(activity)} title={activity.active ? "ปิดใช้งาน" : "เปิดใช้งาน"} aria-label={activity.active ? `ปิดใช้งาน ${activity.title}` : `เปิดใช้งาน ${activity.title}`}><Power size={16} /></button>
                  <button type="button" className="activity-manager-danger" onClick={() => requestDelete(activity)} title="ลบ" aria-label={`ลบ ${activity.title}`}><Trash2 size={16} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <EditorDialog title={editing === "new" ? "เพิ่มภารกิจประจำวัน" : "แก้ไขภารกิจประจำวัน"} onSave={save} onClose={() => setEditing(null)} saveDisabled={!form.title.trim() || !form.category || invalidPeriod}>
          <label className="ui-field">ชื่อภารกิจ<input type="text" value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={200} /></label>
          <label className="ui-field">คำอธิบายภารกิจ<textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={1000} /></label>
          <div className="editor-dialog-row">
            <label className="ui-field">หมวดหมู่
              <select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {categories.map((cat) => <option key={cat.key} value={cat.key}>{cat.label}</option>)}
              </select>
            </label>
            <label className="ui-field">แต้มรางวัลต่อครั้ง<input type="number" min={0} value={form.points} onChange={(e) => set("points", e.target.value)} /></label>
          </div>
          <IconPicker label="ไอคอนของภารกิจ (ไม่เลือกจะใช้ไอคอนของหมวด)" value={form.icon} onChange={(value) => set("icon", value)} allowNone />
          <div className="editor-dialog-row">
            <label className="ui-field">วันที่เริ่มภารกิจ (ถ้ามี)<input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></label>
            <label className="ui-field">วันที่สิ้นสุด (ถ้ามี)<input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => set("endDate", e.target.value)} /></label>
          </div>
          {invalidPeriod && <p className="dialog-error" role="alert">วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม</p>}
          <label className="ui-choice">
            <input type="checkbox" checked={form.requiresApproval} onChange={(e) => set("requiresApproval", e.target.checked)} />
            <span className="ui-choice-mark" aria-hidden="true"><CheckCircle2 size={13} /></span>
            <span className="ui-choice-text">ต้องให้เจ้าหน้าที่อนุมัติก่อนจึงจะได้รับแต้ม</span>
          </label>
          <label className="ui-choice">
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
            <span className="ui-choice-mark" aria-hidden="true"><CheckCircle2 size={13} /></span>
            <span className="ui-choice-text">เปิดใช้งาน (แสดงให้ผู้ใช้งานทำได้)</span>
          </label>
        </EditorDialog>
      )}
    </div>
  );
}
