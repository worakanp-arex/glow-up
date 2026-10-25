import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import EditorDialog from "../../components/common/EditorDialog.jsx";
import IconPicker from "../../components/common/IconPicker.jsx";
import useConfirmDialog from "../../components/common/useConfirmDialog.jsx";
import ActivityMissionManager from "../../components/missions/ActivityMissionManager.jsx";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, Pencil, Plus, Power, Trash2, Trophy } from "lucide-react";
import * as missionService from "../../services/missionService.js";
import * as rewardService from "../../services/rewardService.js";
import * as familyMissionService from "../../services/familyMissionService.js";
import * as missionCategoryService from "../../services/missionCategoryService.js";
import * as adminService from "../../services/adminService.js";
import { resolveIcon } from "../../utils/lucideIcon.js";
import { formatCourseDate, toDateInputValue } from "../../utils/courseDates.js";
import "./MissionManagement.css";

const MISSION_TYPE_LABELS = {
  streak: "เช็คอินต่อเนื่อง (วัน)",
  totalCheckins: "เช็คอินสะสม (ครั้ง)",
  scenarioCompleted: "ฝึกสถานการณ์สำเร็จ (ครั้ง)",
  custom: "กำหนดเอง (เจ้าหน้าที่ทำเครื่องหมายสำเร็จเอง)",
};

const TABS = [
  { key: "missions", label: "ภารกิจสะสมแต้ม" },
  { key: "rewards", label: "เหรียญตรา / รางวัล" },
  { key: "daily", label: "ภารกิจประจำวัน" },
  { key: "family", label: "ภารกิจครอบครัว" },
  { key: "categories", label: "หมวดภารกิจ" },
  { key: "levels", label: "ตั้งค่าระดับ" },
];

const EMPTY_MISSION = { title: "", description: "", type: "streak", targetValue: 7, rewardPoints: 10, badgeIcon: "", order: 0, startDate: "", endDate: "", active: true };
const EMPTY_REWARD = { name: "", description: "", icon: "", pointsRequired: 10 };
const EMPTY_FAMILY = { title: "", description: "", points: 10, active: true };
const EMPTY_CATEGORY = { key: "", label: "", icon: "", order: 0 };

// One row of any catalogue: the real icon, a title, chips and edit / delete actions.
function Row({ icon, title, description, chips, muted, actions }) {
  const Icon = resolveIcon(icon);
  return (
    <li className={`ui-card mission-row${muted ? " is-muted" : ""}`}>
      <span className="mission-row-icon" aria-hidden="true"><Icon size={22} /></span>
      <div className="mission-row-body">
        <p className="mission-row-title">{title}</p>
        {description && <p className="mission-row-desc">{description}</p>}
        <p className="mission-row-chips">{chips}</p>
      </div>
      <div className="mission-row-actions">{actions}</div>
    </li>
  );
}

function Toolbar({ label, onAdd }) {
  return (
    <div className="mission-toolbar">
      <button type="button" className="ui-btn ui-btn-primary" onClick={onAdd}><Plus size={16} aria-hidden="true" />{label}</button>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, danger = false }) {
  return <button type="button" className={danger ? "is-danger" : ""} title={label} aria-label={label} onClick={onClick}><Icon size={16} /></button>;
}

function Check({ checked, onChange, children }) {
  return (
    <label className="ui-choice">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="ui-choice-mark" aria-hidden="true"><CheckCircle2 size={13} /></span>
      <span className="ui-choice-text">{children}</span>
    </label>
  );
}

function Field({ label, children }) {
  return <label className="ui-field">{label}{children}</label>;
}

function periodChip(item) {
  if (!item.startDate && !item.endDate) return null;
  const text = [item.startDate && `เริ่ม ${formatCourseDate(item.startDate)}`, item.endDate && `สิ้นสุด ${formatCourseDate(item.endDate)}`].filter(Boolean).join(" · ");
  return <span className="ui-chip ui-chip-neutral"><CalendarDays size={12} aria-hidden="true" />{text}</span>;
}

function MissionsTab({ items, setItems, notify }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_MISSION);
  const { confirm, confirmDialog } = useConfirmDialog();
  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const invalidPeriod = form.startDate && form.endDate && form.endDate < form.startDate;

  function open(mission) {
    setForm(mission ? {
      title: mission.title,
      description: mission.description || "",
      type: mission.type,
      targetValue: mission.targetValue,
      rewardPoints: mission.rewardPoints ?? 0,
      badgeIcon: mission.badgeIcon || "",
      order: mission.order ?? 0,
      startDate: toDateInputValue(mission.startDate),
      endDate: toDateInputValue(mission.endDate),
      active: mission.active !== false,
    } : EMPTY_MISSION);
    setEditing(mission || "new");
  }

  async function save() {
    const payload = { ...form, targetValue: Number(form.targetValue), rewardPoints: Number(form.rewardPoints), order: Number(form.order) || 0 };
    if (editing === "new") {
      const created = await missionService.createMission(payload);
      setItems((prev) => [created, ...prev]);
    } else {
      const updated = await missionService.updateMission(editing._id, payload);
      setItems((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    }
  }

  async function toggle(mission) {
    const updated = await missionService.updateMission(mission._id, { active: !mission.active });
    setItems((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
  }

  function remove(mission) {
    confirm({
      title: "ลบภารกิจ",
      message: `ต้องการลบภารกิจ "${mission.title}" ใช่ไหม? ถ้ามีผู้ใช้งานทำสำเร็จไปแล้ว ระบบจะซ่อนภารกิจแทนการลบ เพื่อไม่ให้แต้มที่เคยได้รับหายไป`,
      confirmLabel: "ลบภารกิจ",
      onConfirm: async () => {
        const result = await missionService.deleteMission(mission._id);
        if (result?.archived) {
          setItems((prev) => prev.map((item) => (item._id === mission._id ? result.mission : item)));
          notify(`ภารกิจ "${mission.title}" มีผู้ทำสำเร็จแล้ว ${result.completedBy} คน จึงถูกปิดใช้งานแทนการลบ`);
        } else {
          setItems((prev) => prev.filter((item) => item._id !== mission._id));
          notify(`ลบภารกิจ "${mission.title}" แล้ว`);
        }
      },
    });
  }

  return (
    <>
      {confirmDialog}
      <Toolbar label="เพิ่มภารกิจ" onAdd={() => open(null)} />
      {items.length === 0 ? <p className="mission-empty">ยังไม่มีภารกิจในระบบ</p> : (
        <ul className="mission-list">
          {items.map((mission) => (
            <Row
              key={mission._id}
              icon={mission.badgeIcon}
              muted={!mission.active}
              title={mission.title}
              description={mission.description}
              chips={<>
                <span className="ui-chip">{MISSION_TYPE_LABELS[mission.type]}</span>
                <span className="ui-chip ui-chip-neutral">เป้าหมาย {mission.targetValue}</span>
                <span className="ui-chip ui-chip-peach">+{mission.rewardPoints} แต้ม</span>
                {periodChip(mission)}
                {!mission.active && <span className="mission-off-tag">ปิดใช้งาน</span>}
              </>}
              actions={<>
                <ActionButton icon={Pencil} label={`แก้ไข ${mission.title}`} onClick={() => open(mission)} />
                <ActionButton icon={Power} label={mission.active ? `ปิดใช้งาน ${mission.title}` : `เปิดใช้งาน ${mission.title}`} onClick={() => toggle(mission)} />
                <ActionButton icon={Trash2} danger label={`ลบ ${mission.title}`} onClick={() => remove(mission)} />
              </>}
            />
          ))}
        </ul>
      )}

      {editing && (
        <EditorDialog title={editing === "new" ? "เพิ่มภารกิจสะสมแต้ม" : "แก้ไขภารกิจ"} onSave={save} onClose={() => setEditing(null)} saveDisabled={!form.title.trim() || invalidPeriod}>
          <Field label="ชื่อภารกิจ"><input type="text" value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={200} /></Field>
          <Field label="คำอธิบายภารกิจ"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={1000} /></Field>
          <div className="editor-dialog-row">
            <Field label="ประเภท (เปลี่ยนไม่ได้หลังสร้าง)">
              <select value={form.type} onChange={(e) => set("type", e.target.value)} disabled={editing !== "new"}>
                {Object.entries(MISSION_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="เป้าหมาย (จำนวนวัน/ครั้ง)"><input type="number" min={1} value={form.targetValue} onChange={(e) => set("targetValue", e.target.value)} /></Field>
          </div>
          <div className="editor-dialog-row">
            <Field label="แต้มรางวัล"><input type="number" min={0} value={form.rewardPoints} onChange={(e) => set("rewardPoints", e.target.value)} /></Field>
            <Field label="ลำดับการแสดงผล (น้อยขึ้นก่อน)"><input type="number" min={0} value={form.order} onChange={(e) => set("order", e.target.value)} /></Field>
          </div>
          <IconPicker label="ไอคอนตรา" value={form.badgeIcon} onChange={(value) => set("badgeIcon", value)} />
          <div className="editor-dialog-row">
            <Field label="เริ่มรับความคืบหน้า (ถ้ามี)"><input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
            <Field label="สิ้นสุดวันที่ (ถ้ามี)"><input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => set("endDate", e.target.value)} /></Field>
          </div>
          {invalidPeriod && <p className="dialog-error" role="alert">วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม</p>}
          <Check checked={form.active} onChange={(value) => set("active", value)}>เปิดใช้งาน (แสดงบนบอร์ดภารกิจของผู้ใช้งาน)</Check>
        </EditorDialog>
      )}
    </>
  );
}

function RewardsTab({ items, setItems }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_REWARD);
  const { confirm, confirmDialog } = useConfirmDialog();
  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  function open(reward) {
    setForm(reward ? { name: reward.name, description: reward.description || "", icon: reward.icon || "", pointsRequired: reward.pointsRequired } : EMPTY_REWARD);
    setEditing(reward || "new");
  }

  async function save() {
    const payload = { ...form, pointsRequired: Number(form.pointsRequired) };
    if (editing === "new") {
      const created = await rewardService.createReward(payload);
      setItems((prev) => [created, ...prev]);
    } else {
      const updated = await rewardService.updateReward(editing._id, payload);
      setItems((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    }
  }

  function remove(reward) {
    confirm({
      title: "ลบเหรียญตรา",
      message: `ต้องการลบเหรียญตรา "${reward.name}" ใช่ไหม? ผู้ใช้งานที่ได้รับเหรียญนี้ไปแล้วจะไม่เห็นเหรียญนี้อีก`,
      confirmLabel: "ลบเหรียญตรา",
      onConfirm: async () => {
        await rewardService.deleteReward(reward._id);
        setItems((prev) => prev.filter((item) => item._id !== reward._id));
      },
    });
  }

  return (
    <>
      {confirmDialog}
      <Toolbar label="เพิ่มเหรียญตรา" onAdd={() => open(null)} />
      {items.length === 0 ? <p className="mission-empty">ยังไม่มีเหรียญตราในระบบ</p> : (
        <ul className="mission-list">
          {items.map((reward) => (
            <Row
              key={reward._id}
              icon={reward.icon}
              title={reward.name}
              description={reward.description}
              chips={<span className="ui-chip ui-chip-peach">ต้องการ {reward.pointsRequired} แต้ม</span>}
              actions={<>
                <ActionButton icon={Pencil} label={`แก้ไข ${reward.name}`} onClick={() => open(reward)} />
                <ActionButton icon={Trash2} danger label={`ลบ ${reward.name}`} onClick={() => remove(reward)} />
              </>}
            />
          ))}
        </ul>
      )}
      {editing && (
        <EditorDialog title={editing === "new" ? "เพิ่มเหรียญตรา" : "แก้ไขเหรียญตรา"} onSave={save} onClose={() => setEditing(null)} saveDisabled={!form.name.trim()}>
          <Field label="ชื่อเหรียญตรา"><input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required maxLength={200} /></Field>
          <Field label="คำอธิบาย"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={1000} /></Field>
          <Field label="คะแนนสะสมที่ต้องการ"><input type="number" min={0} value={form.pointsRequired} onChange={(e) => set("pointsRequired", e.target.value)} /></Field>
          <IconPicker label="ไอคอน" value={form.icon} onChange={(value) => set("icon", value)} />
        </EditorDialog>
      )}
    </>
  );
}

function FamilyTab({ items, setItems }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FAMILY);
  const { confirm, confirmDialog } = useConfirmDialog();
  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  function open(mission) {
    setForm(mission ? { title: mission.title, description: mission.description || "", points: mission.points ?? 0, active: mission.active !== false } : EMPTY_FAMILY);
    setEditing(mission || "new");
  }

  async function save() {
    const payload = { ...form, points: Number(form.points) };
    if (editing === "new") {
      const created = await familyMissionService.createFamilyMission(payload);
      setItems((prev) => [created, ...prev]);
    } else {
      const updated = await familyMissionService.updateFamilyMission(editing._id, payload);
      setItems((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    }
  }

  async function toggle(mission) {
    const updated = await familyMissionService.updateFamilyMission(mission._id, { active: !mission.active });
    setItems((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
  }

  function remove(mission) {
    confirm({
      title: "ลบภารกิจครอบครัว",
      message: `ต้องการลบภารกิจครอบครัว "${mission.title}" ใช่ไหม? ถ้าต้องการเก็บประวัติแต้มไว้ ให้ปิดใช้งานแทนการลบ`,
      confirmLabel: "ลบภารกิจ",
      onConfirm: async () => {
        await familyMissionService.deleteFamilyMission(mission._id);
        setItems((prev) => prev.filter((item) => item._id !== mission._id));
      },
    });
  }

  return (
    <>
      {confirmDialog}
      <Toolbar label="เพิ่มภารกิจครอบครัว" onAdd={() => open(null)} />
      {items.length === 0 ? <p className="mission-empty">ยังไม่มีภารกิจครอบครัวในระบบ</p> : (
        <ul className="mission-list">
          {items.map((mission) => (
            <Row
              key={mission._id}
              icon="HeartHandshake"
              muted={mission.active === false}
              title={mission.title}
              description={mission.description}
              chips={<>
                <span className="ui-chip ui-chip-peach">+{mission.points} แต้ม เมื่อยืนยันครบทั้งสองฝ่าย</span>
                {mission.active === false && <span className="mission-off-tag">ปิดใช้งาน</span>}
              </>}
              actions={<>
                <ActionButton icon={Pencil} label={`แก้ไข ${mission.title}`} onClick={() => open(mission)} />
                <ActionButton icon={Power} label={mission.active === false ? `เปิดใช้งาน ${mission.title}` : `ปิดใช้งาน ${mission.title}`} onClick={() => toggle(mission)} />
                <ActionButton icon={Trash2} danger label={`ลบ ${mission.title}`} onClick={() => remove(mission)} />
              </>}
            />
          ))}
        </ul>
      )}
      {editing && (
        <EditorDialog title={editing === "new" ? "เพิ่มภารกิจครอบครัว" : "แก้ไขภารกิจครอบครัว"} onSave={save} onClose={() => setEditing(null)} saveDisabled={!form.title.trim()}>
          <Field label="ชื่อภารกิจ"><input type="text" value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={200} /></Field>
          <Field label="คำอธิบายภารกิจ"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={1000} /></Field>
          <Field label="แต้มรางวัล (ให้ผู้ใช้งานเมื่อยืนยันครบทั้งสองฝ่าย)"><input type="number" min={0} value={form.points} onChange={(e) => set("points", e.target.value)} /></Field>
          <Check checked={form.active} onChange={(value) => set("active", value)}>เปิดใช้งาน</Check>
        </EditorDialog>
      )}
    </>
  );
}

function CategoriesTab({ items, setItems }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_CATEGORY);
  const { confirm, confirmDialog } = useConfirmDialog();
  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const sortByOrder = (list) => [...list].sort((a, b) => a.order - b.order);

  function open(category) {
    setForm(category ? { key: category.key, label: category.label, icon: category.icon || "", order: category.order ?? 0 } : EMPTY_CATEGORY);
    setEditing(category || "new");
  }

  async function save() {
    if (editing === "new") {
      const created = await missionCategoryService.createMissionCategory({ ...form, order: Number(form.order) });
      setItems((prev) => sortByOrder([...prev, created]));
    } else {
      const updated = await missionCategoryService.updateMissionCategory(editing._id, { label: form.label, icon: form.icon, order: Number(form.order) });
      setItems((prev) => sortByOrder(prev.map((item) => (item._id === updated._id ? updated : item))));
    }
  }

  function remove(category) {
    confirm({
      title: "ลบหมวดภารกิจ",
      message: `ต้องการลบหมวดภารกิจ "${category.label}" ใช่ไหม? ถ้ายังมีภารกิจใช้หมวดนี้อยู่ ระบบจะไม่อนุญาตให้ลบ`,
      confirmLabel: "ลบหมวด",
      errorMessage: "ลบหมวดภารกิจไม่สำเร็จ",
      onConfirm: async () => {
        await missionCategoryService.deleteMissionCategory(category._id);
        setItems((prev) => prev.filter((item) => item._id !== category._id));
      },
    });
  }

  return (
    <>
      {confirmDialog}
      <Toolbar label="เพิ่มหมวดภารกิจ" onAdd={() => open(null)} />
      {items.length === 0 ? <p className="mission-empty">ยังไม่มีหมวดภารกิจในระบบ</p> : (
        <ul className="mission-list">
          {items.map((category) => (
            <Row
              key={category._id}
              icon={category.icon}
              title={category.label}
              chips={<><span className="ui-chip ui-chip-neutral">รหัส: {category.key}</span><span className="ui-chip">ลำดับ {category.order}</span></>}
              actions={<>
                <ActionButton icon={Pencil} label={`แก้ไข ${category.label}`} onClick={() => open(category)} />
                <ActionButton icon={Trash2} danger label={`ลบ ${category.label}`} onClick={() => remove(category)} />
              </>}
            />
          ))}
        </ul>
      )}
      {editing && (
        <EditorDialog title={editing === "new" ? "เพิ่มหมวดภารกิจ" : "แก้ไขหมวดภารกิจ"} onSave={save} onClose={() => setEditing(null)} saveDisabled={!form.label.trim() || !/^[a-z0-9_]+$/.test(form.key)}>
          <Field label="รหัสหมวด (ภาษาอังกฤษพิมพ์เล็ก ไม่เว้นวรรค — เปลี่ยนไม่ได้หลังสร้าง)">
            <input type="text" value={form.key} onChange={(e) => set("key", e.target.value)} pattern="[a-z0-9_]+" placeholder="เช่น vocational" disabled={editing !== "new"} required />
          </Field>
          <Field label="ชื่อหมวด"><input type="text" value={form.label} onChange={(e) => set("label", e.target.value)} required /></Field>
          <Field label="ลำดับการแสดงผล"><input type="number" value={form.order} onChange={(e) => set("order", e.target.value)} /></Field>
          <IconPicker label="ไอคอนของหมวด" value={form.icon} onChange={(value) => set("icon", value)} />
        </EditorDialog>
      )}
    </>
  );
}

function LevelsTab({ pointsPerLevel, setPointsPerLevel }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await adminService.updatePointsPerLevel(Number(pointsPerLevel));
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="ui-card mission-level-form" onSubmit={save}>
      <div className="ui-card-head"><div><h2>คะแนนสะสมต่อ 1 เลเวล</h2><p>ผู้ใช้งานทุกคนจะเลื่อนเลเวลทุกครั้งที่ได้แต้มครบจำนวนนี้ การเปลี่ยนค่ามีผลกับทุกคนทันที</p></div></div>
      <label className="ui-field">
        แต้มต่อเลเวล
        <input type="number" min={1} value={pointsPerLevel} onChange={(e) => { setPointsPerLevel(e.target.value); setSaved(false); }} />
      </label>
      {saved && <p className="mission-level-saved" role="status">บันทึกแล้ว</p>}
      {error && <p className="dialog-error" role="alert">{error}</p>}
      <button type="submit" className="ui-btn ui-btn-primary" disabled={saving || !pointsPerLevel}>{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
    </form>
  );
}

function MissionManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab = TABS.some((item) => item.key === requested) ? requested : "missions";
  const [missions, setMissions] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [familyMissions, setFamilyMissions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pointsPerLevel, setPointsPerLevel] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([
      missionService.getMissions(),
      rewardService.getRewards(),
      familyMissionService.getFamilyMissions(),
      missionCategoryService.getMissionCategories(),
      adminService.getPointsPerLevel(),
    ])
      .then(([missionData, rewardData, familyMissionData, categoryData, levelSetting]) => {
        setMissions(missionData);
        setRewards(rewardData);
        setFamilyMissions(familyMissionData);
        setCategories(categoryData);
        setPointsPerLevel(String(levelSetting.pointsPerLevel ?? ""));
      })
      .catch((err) => setLoadError(err))
      .finally(() => setLoading(false));
  }, []);

  const header = (
    <PageHeader icon={Trophy} eyebrow="Admin" description="กำหนดภารกิจ คะแนน และเหรียญตราที่ผู้ใช้งานจะได้รับ แก้ไข ปิดใช้งาน หรือลบได้อิสระ ไอคอนเลือกจากภาพตัวอย่างได้เลย">
      จัดการภารกิจ คะแนน และเหรียญตรา
    </PageHeader>
  );

  if (loadError) return <div className="mission-management-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;
  if (loading) return <div className="mission-management-page">{header}<AsyncState /></div>;

  return (
    <div className="mission-management-page">
      {header}
      <div className="ui-tabs" role="tablist" aria-label="หมวดการจัดการ">
        {TABS.map((item) => (
          <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className="ui-tab" onClick={() => { setNotice(""); setSearchParams(item.key === "missions" ? {} : { tab: item.key }); }}>
            {item.label}
          </button>
        ))}
      </div>
      {notice && <p className="mission-notice" role="status">{notice}</p>}

      {tab === "missions" && <MissionsTab items={missions} setItems={setMissions} notify={setNotice} />}
      {tab === "rewards" && <RewardsTab items={rewards} setItems={setRewards} />}
      {tab === "daily" && <ActivityMissionManager />}
      {tab === "family" && <FamilyTab items={familyMissions} setItems={setFamilyMissions} />}
      {tab === "categories" && <CategoriesTab items={categories} setItems={setCategories} />}
      {tab === "levels" && <LevelsTab pointsPerLevel={pointsPerLevel} setPointsPerLevel={setPointsPerLevel} />}
    </div>
  );
}

export default MissionManagement;
