import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Award, Check, Heart, Layers, Pencil, Plus, Sliders, Trash2, Trophy, X } from "lucide-react";
import * as missionService from "../../services/missionService.js";
import * as rewardService from "../../services/rewardService.js";
import * as familyMissionService from "../../services/familyMissionService.js";
import * as missionCategoryService from "../../services/missionCategoryService.js";
import * as adminService from "../../services/adminService.js";
import { ICON_NAMES } from "../../utils/lucideIcon.js";
import "./MissionManagement.css";

const MISSION_TYPE_LABELS = {
  streak: "เช็คอินต่อเนื่อง (วัน)",
  totalCheckins: "เช็คอินสะสม (ครั้ง)",
  scenarioCompleted: "ฝึกสถานการณ์สำเร็จ (ครั้ง)",
  custom: "กำหนดเอง (เจ้าหน้าที่ทำเครื่องหมายสำเร็จเอง)",
};

const INITIAL_MISSION_FORM = {
  title: "",
  description: "",
  type: "streak",
  targetValue: 7,
  rewardPoints: 10,
  badgeIcon: "",
  active: true,
};
const INITIAL_REWARD_FORM = { name: "", description: "", icon: "", pointsRequired: 10 };
const INITIAL_FAMILY_MISSION_FORM = { title: "", description: "", points: 10 };
const INITIAL_CATEGORY_FORM = { key: "", label: "", icon: "", order: 0 };

function MissionManagement() {
  const [missions, setMissions] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [missionForm, setMissionForm] = useState(INITIAL_MISSION_FORM);
  const [savingMission, setSavingMission] = useState(false);
  const [missionError, setMissionError] = useState("");
  const [editingMissionId, setEditingMissionId] = useState(null);
  const [missionEditForm, setMissionEditForm] = useState(null);

  const [rewardForm, setRewardForm] = useState(INITIAL_REWARD_FORM);
  const [savingReward, setSavingReward] = useState(false);
  const [rewardError, setRewardError] = useState("");
  const [editingRewardId, setEditingRewardId] = useState(null);
  const [rewardEditForm, setRewardEditForm] = useState(null);

  const [familyMissions, setFamilyMissions] = useState([]);
  const [familyMissionForm, setFamilyMissionForm] = useState(INITIAL_FAMILY_MISSION_FORM);
  const [savingFamilyMission, setSavingFamilyMission] = useState(false);
  const [familyMissionError, setFamilyMissionError] = useState("");

  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState(INITIAL_CATEGORY_FORM);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryEditForm, setCategoryEditForm] = useState(null);

  const [pointsPerLevel, setPointsPerLevel] = useState("");
  const [savingLevelSetting, setSavingLevelSetting] = useState(false);
  const [levelSettingSaved, setLevelSettingSaved] = useState(false);

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
        setPointsPerLevel(String(levelSetting.pointsPerLevel));
      })
      .catch((err) => setLoadError(err))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateMission(e) {
    e.preventDefault();
    setMissionError("");
    setSavingMission(true);
    try {
      const created = await missionService.createMission({
        ...missionForm,
        targetValue: Number(missionForm.targetValue),
        rewardPoints: Number(missionForm.rewardPoints),
      });
      setMissions((prev) => [created, ...prev]);
      setMissionForm(INITIAL_MISSION_FORM);
    } catch (err) {
      setMissionError(err.response?.data?.message || "เพิ่มภารกิจไม่สำเร็จ");
    } finally {
      setSavingMission(false);
    }
  }

  function startEditMission(mission) {
    setEditingMissionId(mission._id);
    setMissionEditForm({ ...mission });
  }

  async function saveEditMission() {
    const updated = await missionService.updateMission(editingMissionId, {
      ...missionEditForm,
      targetValue: Number(missionEditForm.targetValue),
      rewardPoints: Number(missionEditForm.rewardPoints),
    });
    setMissions((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
    setEditingMissionId(null);
  }

  async function handleDeleteMission(mission) {
    if (!window.confirm(`ลบภารกิจ "${mission.title}"?`)) return;
    await missionService.deleteMission(mission._id);
    setMissions((prev) => prev.filter((m) => m._id !== mission._id));
  }

  async function handleCreateReward(e) {
    e.preventDefault();
    setRewardError("");
    setSavingReward(true);
    try {
      const created = await rewardService.createReward({
        ...rewardForm,
        pointsRequired: Number(rewardForm.pointsRequired),
      });
      setRewards((prev) => [created, ...prev]);
      setRewardForm(INITIAL_REWARD_FORM);
    } catch (err) {
      setRewardError(err.response?.data?.message || "เพิ่มเหรียญตราไม่สำเร็จ");
    } finally {
      setSavingReward(false);
    }
  }

  function startEditReward(reward) {
    setEditingRewardId(reward._id);
    setRewardEditForm({ ...reward });
  }

  async function saveEditReward() {
    const updated = await rewardService.updateReward(editingRewardId, {
      ...rewardEditForm,
      pointsRequired: Number(rewardEditForm.pointsRequired),
    });
    setRewards((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
    setEditingRewardId(null);
  }

  async function handleDeleteReward(reward) {
    if (!window.confirm(`ลบเหรียญตรา "${reward.name}"?`)) return;
    await rewardService.deleteReward(reward._id);
    setRewards((prev) => prev.filter((r) => r._id !== reward._id));
  }

  async function handleCreateFamilyMission(e) {
    e.preventDefault();
    setFamilyMissionError("");
    setSavingFamilyMission(true);
    try {
      const created = await familyMissionService.createFamilyMission({
        ...familyMissionForm,
        points: Number(familyMissionForm.points),
      });
      setFamilyMissions((prev) => [created, ...prev]);
      setFamilyMissionForm(INITIAL_FAMILY_MISSION_FORM);
    } catch (err) {
      setFamilyMissionError(err.response?.data?.message || "เพิ่มภารกิจครอบครัวไม่สำเร็จ");
    } finally {
      setSavingFamilyMission(false);
    }
  }

  async function handleDeleteFamilyMission(mission) {
    if (!window.confirm(`ลบภารกิจครอบครัว "${mission.title}"?`)) return;
    await familyMissionService.deleteFamilyMission(mission._id);
    setFamilyMissions((prev) => prev.filter((m) => m._id !== mission._id));
  }

  async function handleCreateCategory(e) {
    e.preventDefault();
    setCategoryError("");
    setSavingCategory(true);
    try {
      const created = await missionCategoryService.createMissionCategory({
        ...categoryForm,
        order: Number(categoryForm.order),
      });
      setCategories((prev) => [...prev, created].sort((a, b) => a.order - b.order));
      setCategoryForm(INITIAL_CATEGORY_FORM);
    } catch (err) {
      setCategoryError(err.response?.data?.message || "เพิ่มหมวดภารกิจไม่สำเร็จ");
    } finally {
      setSavingCategory(false);
    }
  }

  function startEditCategory(category) {
    setEditingCategoryId(category._id);
    setCategoryEditForm({ ...category });
  }

  async function saveEditCategory() {
    const updated = await missionCategoryService.updateMissionCategory(editingCategoryId, {
      label: categoryEditForm.label,
      icon: categoryEditForm.icon,
      order: Number(categoryEditForm.order),
    });
    setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)).sort((a, b) => a.order - b.order));
    setEditingCategoryId(null);
  }

  async function handleDeleteCategory(category) {
    if (!window.confirm(`ลบหมวดภารกิจ "${category.label}"?`)) return;
    try {
      await missionCategoryService.deleteMissionCategory(category._id);
      setCategories((prev) => prev.filter((c) => c._id !== category._id));
    } catch (err) {
      window.alert(err.response?.data?.message || "ลบหมวดภารกิจไม่สำเร็จ");
    }
  }

  async function handleSaveLevelSetting(e) {
    e.preventDefault();
    setSavingLevelSetting(true);
    setLevelSettingSaved(false);
    try {
      await adminService.updatePointsPerLevel(Number(pointsPerLevel));
      setLevelSettingSaved(true);
    } finally {
      setSavingLevelSetting(false);
    }
  }

  if (loadError) {
    return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;
  }
  if (loading) {
    return <div className="mission-management-page"><AsyncState /></div>;
  }

  return (
    <div className="mission-management-page">
      <datalist id="lucide-icon-names">
        {ICON_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <PageHeader
        icon={Trophy}
        description="กำหนดภารกิจสะสมแต้ม เกณฑ์คะแนน และเหรียญตราที่ผู้ใช้งานจะได้รับเมื่อทำภารกิจสำเร็จ"
      >
        จัดการภารกิจ คะแนน และเหรียญตรา
      </PageHeader>

      <section className="mission-management-section">
        <h2>
          <Sliders size={18} />
          <span>ตั้งค่าระดับ (Level)</span>
        </h2>
        <form className="mission-management-level-form" onSubmit={handleSaveLevelSetting}>
          <label>
            คะแนนสะสมต่อ 1 เลเวล
            <input
              type="number"
              min={1}
              value={pointsPerLevel}
              onChange={(e) => { setPointsPerLevel(e.target.value); setLevelSettingSaved(false); }}
            />
          </label>
          {levelSettingSaved && <span className="mission-management-level-saved">บันทึกแล้ว</span>}
          <button type="submit" className="btn btn-primary" disabled={savingLevelSetting || !pointsPerLevel}>
            {savingLevelSetting ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </form>
      </section>

      <section className="mission-management-section">
        <h2>
          <Layers size={18} />
          <span>หมวดภารกิจ</span>
        </h2>

        <form className="mission-management-form" onSubmit={handleCreateCategory}>
          <div className="mission-management-form-grid">
            <label>
              รหัสหมวด (ภาษาอังกฤษ, ไม่เว้นวรรค)
              <input
                type="text"
                placeholder="เช่น vocational"
                value={categoryForm.key}
                onChange={(e) => setCategoryForm((f) => ({ ...f, key: e.target.value }))}
                pattern="[a-z0-9_]+"
                required
              />
            </label>
            <label>
              ชื่อหมวด
              <input
                type="text"
                value={categoryForm.label}
                onChange={(e) => setCategoryForm((f) => ({ ...f, label: e.target.value }))}
                required
              />
            </label>
            <label>
              ไอคอน (ชื่อไอคอนจาก lucide-react)
              <input
                type="text"
                list="lucide-icon-names"
                placeholder="เช่น Briefcase"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm((f) => ({ ...f, icon: e.target.value }))}
              />
            </label>
            <label>
              ลำดับการแสดงผล
              <input
                type="number"
                value={categoryForm.order}
                onChange={(e) => setCategoryForm((f) => ({ ...f, order: e.target.value }))}
              />
            </label>
          </div>
          {categoryError && <p className="mission-management-error">{categoryError}</p>}
          <button type="submit" className="btn btn-primary" disabled={savingCategory}>
            <Plus size={16} />
            <span>{savingCategory ? "กำลังเพิ่ม..." : "เพิ่มหมวดภารกิจ"}</span>
          </button>
        </form>

        {categories.length === 0 ? (
          <p className="mission-management-empty">ยังไม่มีหมวดภารกิจในระบบ</p>
        ) : (
          <ul className="mission-management-list">
            {categories.map((category) => (
              <li key={category._id}>
                {editingCategoryId === category._id ? (
                  <div className="mission-management-edit-form">
                    <span>{category.key}</span>
                    <input
                      value={categoryEditForm.label}
                      onChange={(e) => setCategoryEditForm((f) => ({ ...f, label: e.target.value }))}
                    />
                    <input
                      list="lucide-icon-names"
                      value={categoryEditForm.icon || ""}
                      onChange={(e) => setCategoryEditForm((f) => ({ ...f, icon: e.target.value }))}
                    />
                    <input
                      type="number"
                      value={categoryEditForm.order}
                      onChange={(e) => setCategoryEditForm((f) => ({ ...f, order: e.target.value }))}
                    />
                    <button type="button" onClick={saveEditCategory} title="บันทึก">
                      <Check size={16} />
                    </button>
                    <button type="button" onClick={() => setEditingCategoryId(null)} title="ยกเลิก">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mission-management-list-body">
                      <p className="mission-management-list-title">{category.label}</p>
                      <p className="mission-management-list-meta">
                        <span>รหัส: {category.key}</span>
                        {category.icon && <span>ไอคอน: {category.icon}</span>}
                      </p>
                    </div>
                    <div className="mission-management-list-actions">
                      <button type="button" onClick={() => startEditCategory(category)} title="แก้ไข">
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="mission-management-delete" onClick={() => handleDeleteCategory(category)} title="ลบ">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mission-management-section">
        <h2>
          <Trophy size={18} />
          <span>ภารกิจสะสมแต้ม</span>
        </h2>

        <form className="mission-management-form" onSubmit={handleCreateMission}>
          <div className="mission-management-form-grid">
            <label>
              ชื่อภารกิจ
              <input
                type="text"
                value={missionForm.title}
                onChange={(e) => setMissionForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </label>
            <label>
              ประเภท
              <select
                value={missionForm.type}
                onChange={(e) => setMissionForm((f) => ({ ...f, type: e.target.value }))}
              >
                {Object.entries(MISSION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              เป้าหมาย (เช่น จำนวนวัน/ครั้ง)
              <input
                type="number"
                min={1}
                value={missionForm.targetValue}
                onChange={(e) => setMissionForm((f) => ({ ...f, targetValue: e.target.value }))}
              />
            </label>
            <label>
              แต้มรางวัล
              <input
                type="number"
                min={0}
                value={missionForm.rewardPoints}
                onChange={(e) => setMissionForm((f) => ({ ...f, rewardPoints: e.target.value }))}
              />
            </label>
            <label>
              ไอคอนตรา (ชื่อไอคอนจาก lucide-react)
              <input
                type="text"
                list="lucide-icon-names"
                placeholder="เช่น Flame, Award, Trophy"
                value={missionForm.badgeIcon}
                onChange={(e) => setMissionForm((f) => ({ ...f, badgeIcon: e.target.value }))}
              />
            </label>
          </div>
          <label className="mission-management-description-field">
            คำอธิบายภารกิจ
            <textarea
              value={missionForm.description}
              onChange={(e) => setMissionForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </label>
          {missionError && <p className="mission-management-error">{missionError}</p>}
          <button type="submit" className="btn btn-primary" disabled={savingMission}>
            <Plus size={16} />
            <span>{savingMission ? "กำลังเพิ่ม..." : "เพิ่มภารกิจ"}</span>
          </button>
        </form>

        {missions.length === 0 ? (
          <p className="mission-management-empty">ยังไม่มีภารกิจในระบบ</p>
        ) : (
          <ul className="mission-management-list">
            {missions.map((mission) => (
              <li key={mission._id}>
                {editingMissionId === mission._id ? (
                  <div className="mission-management-edit-form">
                    <input
                      value={missionEditForm.title}
                      onChange={(e) => setMissionEditForm((f) => ({ ...f, title: e.target.value }))}
                    />
                    <select
                      value={missionEditForm.type}
                      onChange={(e) => setMissionEditForm((f) => ({ ...f, type: e.target.value }))}
                    >
                      {Object.entries(MISSION_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={missionEditForm.targetValue}
                      onChange={(e) => setMissionEditForm((f) => ({ ...f, targetValue: e.target.value }))}
                    />
                    <input
                      type="number"
                      min={0}
                      value={missionEditForm.rewardPoints}
                      onChange={(e) => setMissionEditForm((f) => ({ ...f, rewardPoints: e.target.value }))}
                    />
                    <label className="mission-management-active-toggle">
                      <input
                        type="checkbox"
                        checked={missionEditForm.active}
                        onChange={(e) => setMissionEditForm((f) => ({ ...f, active: e.target.checked }))}
                      />
                      <span>เปิดใช้งาน</span>
                    </label>
                    <button type="button" onClick={saveEditMission} title="บันทึก">
                      <Check size={16} />
                    </button>
                    <button type="button" onClick={() => setEditingMissionId(null)} title="ยกเลิก">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mission-management-list-body">
                      <p className="mission-management-list-title">
                        {mission.title}
                        {!mission.active && <span className="mission-management-inactive-tag">ปิดใช้งาน</span>}
                      </p>
                      <p className="mission-management-list-meta">
                        <span>{MISSION_TYPE_LABELS[mission.type]}</span>
                        <span>เป้าหมาย {mission.targetValue}</span>
                        <span>+{mission.rewardPoints} แต้ม</span>
                      </p>
                    </div>
                    <div className="mission-management-list-actions">
                      <button type="button" onClick={() => startEditMission(mission)} title="แก้ไข">
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="mission-management-delete" onClick={() => handleDeleteMission(mission)} title="ลบ">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mission-management-section">
        <h2>
          <Award size={18} />
          <span>เหรียญตรา / รางวัล</span>
        </h2>

        <form className="mission-management-form" onSubmit={handleCreateReward}>
          <div className="mission-management-form-grid">
            <label>
              ชื่อเหรียญตรา
              <input
                type="text"
                value={rewardForm.name}
                onChange={(e) => setRewardForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </label>
            <label>
              คะแนนสะสมที่ต้องการ
              <input
                type="number"
                min={0}
                value={rewardForm.pointsRequired}
                onChange={(e) => setRewardForm((f) => ({ ...f, pointsRequired: e.target.value }))}
              />
            </label>
            <label>
              ไอคอน (ชื่อไอคอนจาก lucide-react)
              <input
                type="text"
                list="lucide-icon-names"
                placeholder="เช่น Sprout, Award, Trophy"
                value={rewardForm.icon}
                onChange={(e) => setRewardForm((f) => ({ ...f, icon: e.target.value }))}
              />
            </label>
          </div>
          <label className="mission-management-description-field">
            คำอธิบาย
            <textarea
              value={rewardForm.description}
              onChange={(e) => setRewardForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </label>
          {rewardError && <p className="mission-management-error">{rewardError}</p>}
          <button type="submit" className="btn btn-primary" disabled={savingReward}>
            <Plus size={16} />
            <span>{savingReward ? "กำลังเพิ่ม..." : "เพิ่มเหรียญตรา"}</span>
          </button>
        </form>

        {rewards.length === 0 ? (
          <p className="mission-management-empty">ยังไม่มีเหรียญตราในระบบ</p>
        ) : (
          <ul className="mission-management-list">
            {rewards.map((reward) => (
              <li key={reward._id}>
                {editingRewardId === reward._id ? (
                  <div className="mission-management-edit-form">
                    <input
                      value={rewardEditForm.name}
                      onChange={(e) => setRewardEditForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    <input
                      type="number"
                      min={0}
                      value={rewardEditForm.pointsRequired}
                      onChange={(e) => setRewardEditForm((f) => ({ ...f, pointsRequired: e.target.value }))}
                    />
                    <input
                      value={rewardEditForm.icon || ""}
                      onChange={(e) => setRewardEditForm((f) => ({ ...f, icon: e.target.value }))}
                    />
                    <button type="button" onClick={saveEditReward} title="บันทึก">
                      <Check size={16} />
                    </button>
                    <button type="button" onClick={() => setEditingRewardId(null)} title="ยกเลิก">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mission-management-list-body">
                      <p className="mission-management-list-title">{reward.name}</p>
                      <p className="mission-management-list-meta">
                        <span>ต้องการ {reward.pointsRequired} แต้ม</span>
                        {reward.icon && <span>ไอคอน: {reward.icon}</span>}
                      </p>
                    </div>
                    <div className="mission-management-list-actions">
                      <button type="button" onClick={() => startEditReward(reward)} title="แก้ไข">
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="mission-management-delete" onClick={() => handleDeleteReward(reward)} title="ลบ">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mission-management-section">
        <h2>
          <Heart size={18} />
          <span>ภารกิจครอบครัวร่วมกัน</span>
        </h2>

        <form className="mission-management-form" onSubmit={handleCreateFamilyMission}>
          <div className="mission-management-form-grid">
            <label>
              ชื่อภารกิจ
              <input
                type="text"
                value={familyMissionForm.title}
                onChange={(e) => setFamilyMissionForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </label>
            <label>
              แต้มรางวัล (ให้ผู้ใช้งานเมื่อยืนยันครบทั้งสองฝ่าย)
              <input
                type="number"
                min={0}
                value={familyMissionForm.points}
                onChange={(e) => setFamilyMissionForm((f) => ({ ...f, points: e.target.value }))}
              />
            </label>
          </div>
          <label className="mission-management-description-field">
            คำอธิบายภารกิจ
            <textarea
              value={familyMissionForm.description}
              onChange={(e) => setFamilyMissionForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </label>
          {familyMissionError && <p className="mission-management-error">{familyMissionError}</p>}
          <button type="submit" className="btn btn-primary" disabled={savingFamilyMission}>
            <Plus size={16} />
            <span>{savingFamilyMission ? "กำลังเพิ่ม..." : "เพิ่มภารกิจครอบครัว"}</span>
          </button>
        </form>

        {familyMissions.length === 0 ? (
          <p className="mission-management-empty">ยังไม่มีภารกิจครอบครัวในระบบ</p>
        ) : (
          <ul className="mission-management-list">
            {familyMissions.map((mission) => (
              <li key={mission._id}>
                <div className="mission-management-list-body">
                  <p className="mission-management-list-title">{mission.title}</p>
                  <p className="mission-management-list-meta">
                    <span>+{mission.points} แต้ม เมื่อยืนยันครบทั้งสองฝ่าย</span>
                  </p>
                </div>
                <div className="mission-management-list-actions">
                  <button type="button" className="mission-management-delete" onClick={() => handleDeleteFamilyMission(mission)} title="ลบ">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default MissionManagement;
