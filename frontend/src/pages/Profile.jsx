import PageHeader from "../components/common/PageHeader.jsx";
import AsyncState from "../components/common/AsyncState.jsx";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Award, BookOpen, Briefcase, Camera, Check, ChevronRight, FileText, Heart, Leaf, Lock, Mail, MapPin, Pencil, Plus, Sparkles, Trash2, User, Users, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import * as userService from "../services/userService.js";
import * as skillService from "../services/skillService.js";
import * as emotionService from "../services/emotionService.js";
import * as courseService from "../services/courseService.js";
import * as familyService from "../services/familyService.js";
import * as goalService from "../services/goalService.js";
import StatusBadge from "../components/common/StatusBadge.jsx";
import GrowthCard from "../components/user/GrowthCard.jsx";
import useConfirmDialog from "../components/common/useConfirmDialog.jsx";
import { THAI_PROVINCES } from "../constants/provinces.js";
import "./Profile.css";

const FAMILY_STATUS_LABELS = { pending: "รอการตอบรับ", active: "ติดตามอยู่" };

const ROLE_LABELS = {
  user: "ผู้หางาน",
  family: "ครอบครัว/ผู้ดูแล",
  employer: "นายจ้าง",
  admin: "ผู้ดูแลระบบ",
  counsellor: "บุคลากรทางการแพทย์",
};
const LEVELS = [1, 2, 3, 4, 5];

const TABS = [
  { key: "overview", label: "ภาพรวมและเป้าหมาย" },
  { key: "skills", label: "ทักษะและอาชีพ" },
  { key: "family", label: "ครอบครัวและสิทธิ์" },
  { key: "personal", label: "ข้อมูลส่วนตัว" },
];

const SHARING_OPTIONS = [
  { key: "progress", title: "ระดับและความสำเร็จ", hint: "เห็นคะแนนกิจกรรม เลเวล และหมุดหมายของคุณ" },
  { key: "missions", title: "ภารกิจที่ทำร่วมกัน", hint: "เห็นเฉพาะภารกิจครอบครัวที่คุณเลือกทำร่วมกัน" },
];

const EMPTY_GOAL = { title: "", description: "", progress: 0 };

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function Profile() {
  const { user, updateUser } = useAuth();
  const isUser = user.role === "user";
  const [searchParams] = useSearchParams();
  // ?tab=skills etc. lets other pages link straight to a profile section.
  const [tab, setTab] = useState(() => {
    const requested = searchParams.get("tab");
    if (!isUser) return "personal";
    return TABS.some((t) => t.key === requested) ? requested : "overview";
  });
  const [form, setForm] = useState({
    name: user.name || "",
    nickname: user.nickname || "",
    phone: user.phone || "",
    province: user.province || "",
    bio: user.bio || "",
    age: user.age || "",
    gender: user.gender || "",
    address: user.address || "",
    education: user.education || "",
    experience: user.experience || "",
    companyName: user.companyName || "",
    businessType: user.businessType || "",
    taxId: user.taxId || "",
    specialization: user.specialization || "",
    hospital: user.hospital || "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  const [resumeUploading, setResumeUploading] = useState(false);
  const resumeInputRef = useRef(null);

  const [certName, setCertName] = useState("");
  const certInputRef = useRef(null);
  const [certUploading, setCertUploading] = useState(false);

  const [allSkills, setAllSkills] = useState([]);
  const [mySkills, setMySkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [skillLevel, setSkillLevel] = useState(3);
  const [skillsLoading, setSkillsLoading] = useState(isUser);

  const [recovery, setRecovery] = useState(null);
  const [recoveryError, setRecoveryError] = useState(false);
  const [streak, setStreak] = useState(null);
  const [myCourses, setMyCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);

  const [goals, setGoals] = useState(null);
  const [goalForm, setGoalForm] = useState(null);
  const [goalSaving, setGoalSaving] = useState(false);

  const [familyLinks, setFamilyLinks] = useState([]);
  const [familyEmail, setFamilyEmail] = useState("");
  const [familyInviting, setFamilyInviting] = useState(false);
  const [familyError, setFamilyError] = useState("");
  const { confirm: requestConfirm, confirmDialog } = useConfirmDialog();
  const [sharingSaving, setSharingSaving] = useState(null);

  useEffect(() => {
    if (!isUser) return;
    Promise.all([skillService.getSkills(), skillService.getMySkills()])
      .then(([skills, mine]) => {
        setAllSkills(skills);
        setMySkills(mine);
      })
      .finally(() => setSkillsLoading(false));
  }, [isUser]);

  useEffect(() => {
    if (!isUser) return;
    userService.getMyRecoverySummary().then(setRecovery).catch(() => setRecoveryError(true));
    emotionService.getMyStreak().then(setStreak).catch(() => setStreak(null));
    courseService.getMyCourses().then(setMyCourses).catch(() => setMyCourses([]));
    courseService.getCourses().then(setAllCourses).catch(() => setAllCourses([]));
    familyService.getMyInvitedFamily().then(setFamilyLinks).catch(() => setFamilyLinks([]));
    goalService.getMyGoals().then(setGoals).catch(() => setGoals([]));
  }, [isUser]);

  async function handleInviteFamily(e) {
    e.preventDefault();
    const email = familyEmail.trim();
    if (!email) return;
    setFamilyInviting(true);
    setFamilyError("");
    try {
      await familyService.inviteFamilyMember(email);
      setFamilyEmail("");
      const links = await familyService.getMyInvitedFamily();
      setFamilyLinks(links);
    } catch (err) {
      setFamilyError(err.response?.data?.message || "ส่งคำเชิญไม่สำเร็จ");
    } finally {
      setFamilyInviting(false);
    }
  }

  function requestRevokeFamily(link) {
    const isActive = link.status === "active";
    requestConfirm({
      title: isActive ? "ยกเลิกการติดตามของครอบครัวนี้?" : "ยกเลิกคำเชิญนี้?",
      message: isActive
        ? `${link.inviteEmail} จะได้รับแจ้งเตือนว่าถูกลบออกจากการเชื่อมต่อ และจะไม่เห็นความคืบหน้าของคุณอีก`
        : `คำเชิญไปยัง ${link.inviteEmail} จะถูกยกเลิก ลิงก์เดิมจะใช้งานไม่ได้อีก`,
      confirmLabel: "ยืนยันการลบ",
      errorMessage: "ยกเลิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      onConfirm: async () => {
        await familyService.revokeFamilyLink(link._id);
        setFamilyLinks((prev) => prev.filter((item) => item._id !== link._id));
      },
    });
  }

  async function handleToggleSharing(key) {
    const current = user.familySharing?.[key] !== false;
    setSharingSaving(key);
    setFamilyError("");
    try {
      const updated = await userService.updateMyProfile({ familySharing: { [key]: !current } });
      updateUser(updated);
    } catch (err) {
      setFamilyError(err.response?.data?.message || "บันทึกการตั้งค่าไม่สำเร็จ");
    } finally {
      setSharingSaving(null);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = { ...form, age: form.age ? Number(form.age) : undefined };
      const updated = await userService.updateMyProfile(payload);
      updateUser(updated);
      setMessage("บันทึกข้อมูลเรียบร้อยแล้ว");
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    setError("");
    try {
      const updated = await userService.uploadMyAvatar(file);
      updateUser(updated);
    } catch (err) {
      setError(err.response?.data?.message || "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  }

  async function handleResumeSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setResumeUploading(true);
    setError("");
    try {
      const updated = await userService.uploadMyResume(file);
      updateUser(updated);
    } catch (err) {
      setError(err.response?.data?.message || "อัปโหลดเรซูเม่ไม่สำเร็จ");
    } finally {
      setResumeUploading(false);
      e.target.value = "";
    }
  }

  function handleCertFilePick() {
    if (!certName.trim()) {
      setError("กรุณาตั้งชื่อใบเซอร์ก่อนเลือกไฟล์");
      return;
    }
    setError("");
    certInputRef.current?.click();
  }

  async function handleCertSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCertUploading(true);
    try {
      const updated = await userService.addMyCertificate(file, certName.trim());
      updateUser(updated);
      setCertName("");
    } catch (err) {
      setError(err.response?.data?.message || "อัปโหลดใบเซอร์ไม่สำเร็จ");
    } finally {
      setCertUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemoveCertificate(id) {
    const updated = await userService.removeMyCertificate(id);
    updateUser(updated);
  }

  const availableSkills = allSkills.filter(
    (skill) => !mySkills.some((mine) => mine.skill._id === skill._id)
  );

  async function handleAddSkill(e) {
    e.preventDefault();
    const name = skillInput.trim();
    if (!name) return;
    const match = availableSkills.find((skill) => skill.skillName.toLowerCase() === name.toLowerCase());
    if (!match) {
      setError("ไม่พบทักษะนี้ในระบบ กรุณาเลือกจากรายการที่แนะนำ");
      return;
    }
    try {
      const created = await skillService.addMySkill({ skill: match._id, level: Number(skillLevel) });
      setMySkills((prev) => [...prev, created]);
      setSkillInput("");
      setSkillLevel(3);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "เพิ่มทักษะไม่สำเร็จ");
    }
  }

  async function handleSkillLevelChange(id, newLevel) {
    const updated = await skillService.updateMySkill(id, { level: Number(newLevel) });
    setMySkills((prev) => prev.map((item) => (item._id === id ? updated : item)));
  }

  async function handleRemoveSkill(id) {
    await skillService.removeMySkill(id);
    setMySkills((prev) => prev.filter((item) => item._id !== id));
  }

  async function handleGoalSubmit(e) {
    e.preventDefault();
    if (!goalForm.title.trim()) return;
    setGoalSaving(true);
    setError("");
    try {
      const payload = { title: goalForm.title.trim(), description: goalForm.description.trim() };
      if (goalForm._id) {
        const updated = await goalService.updateGoal(goalForm._id, { ...payload, progress: Number(goalForm.progress) });
        setGoals((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
      } else {
        const created = await goalService.createGoal({ ...payload, term: "short" });
        setGoals((prev) => [created, ...(prev || [])]);
      }
      setGoalForm(null);
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกเป้าหมายไม่สำเร็จ");
    } finally {
      setGoalSaving(false);
    }
  }

  async function handleGoalDelete(id) {
    try {
      await goalService.deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g._id !== id));
      setGoalForm(null);
    } catch (err) {
      setError(err.response?.data?.message || "ลบเป้าหมายไม่สำเร็จ");
    }
  }

  function recoveryText() {
    if (recoveryError) return "โหลดประวัติไม่สำเร็จ";
    if (!recovery) return "กำลังโหลด...";
    if (recovery.ongoing) return "อยู่ระหว่างการบำบัด";
    if (!recovery.endDate) return "ยังไม่มีวันที่สิ้นสุดการบำบัด";
    return `${Math.max(0, Math.floor((Date.now() - new Date(recovery.endDate).getTime()) / 86400000)).toLocaleString("th-TH")} วัน`;
  }

  const activeGoals = (goals || []).filter((g) => g.status === "active");
  // Top the learning card up to 3 rows with courses the user hasn't saved yet.
  const enrolledIds = new Set(myCourses.map((e) => e.course?._id));
  const suggestedCourses = allCourses.filter((c) => !enrolledIds.has(c._id)).slice(0, Math.max(0, 3 - myCourses.length));
  const doneGoals = (goals || []).filter((g) => g.status === "completed");

  const profileCard = (
    <section className="ui-card profile-hero">
      <button
        type="button"
        className="profile-banner-avatar"
        aria-label="เปลี่ยนรูปโปรไฟล์"
        title={avatarUploading ? "กำลังอัปโหลดรูป..." : "คลิกเพื่อเปลี่ยนรูปโปรไฟล์"}
        onClick={() => avatarInputRef.current?.click()}
        disabled={avatarUploading}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="รูปโปรไฟล์" />
        ) : (
          <span className="profile-avatar-fallback">{initials(user.nickname || user.name)}</span>
        )}
        <span className="profile-avatar-overlay">
          <Camera size={14} />
        </span>
      </button>
      <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleAvatarSelect} />

      <div className="profile-hero-body">
        <h2 className="profile-banner-name">{user.name || "-"}</h2>
        {user.bio && <p className="profile-hero-bio">{user.bio}</p>}
        <div className="profile-banner-badges">
          <span className="profile-role-badge">{ROLE_LABELS[user.role]}</span>
          <StatusBadge status={user.verifiedStatus} />
          {user.province && <span className="ui-chip ui-chip-neutral"><MapPin size={12} aria-hidden="true" />{user.province}</span>}
        </div>
      </div>

      {tab !== "personal" && (
        <button type="button" className="ui-btn ui-btn-outline profile-edit-btn" onClick={() => setTab("personal")}>
          <Pencil size={15} aria-hidden="true" />แก้ไขข้อมูล
        </button>
      )}
    </section>
  );

  const personalForm = (
    <form className="ui-card profile-form-row" onSubmit={handleSubmit}>
      <div className="ui-card-head">
        <div>
          <h2>ข้อมูลส่วนตัว</h2>
          <p>ข้อมูลติดต่อและข้อมูลประกอบโปรไฟล์</p>
        </div>
        <User size={18} aria-hidden="true" />
      </div>

      <div className="profile-form-grid">
        <label className="ui-field">
          {user.role === "employer" ? "ชื่อผู้ติดต่อ" : "ชื่อ-นามสกุล"}
          <input type="text" name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label className="ui-field">
          ชื่อที่อยากให้เรียก
          <input type="text" name="nickname" value={form.nickname} onChange={handleChange} placeholder="เช่น ชื่อเล่น" />
        </label>
        <label className="ui-field">
          อีเมล
          <input type="email" value={user.email} readOnly disabled title="ใช้สำหรับเข้าสู่ระบบ เปลี่ยนไม่ได้" />
        </label>
        <label className="ui-field">
          เบอร์โทรศัพท์
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="ยังไม่ระบุ" />
        </label>
        <label className="ui-field">
          จังหวัด
          <select name="province" value={form.province} onChange={handleChange}>
            <option value="">ยังไม่ระบุ</option>
            {THAI_PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}
          </select>
        </label>
        {isUser && (
          <>
            <label className="ui-field">
              ระดับการศึกษา
              <input type="text" name="education" value={form.education} onChange={handleChange} placeholder="ยังไม่ระบุ" />
            </label>
            <label className="ui-field">
              อายุ
              <input type="number" name="age" min={0} value={form.age} onChange={handleChange} placeholder="ยังไม่ระบุ" />
            </label>
            <label className="ui-field">
              เพศ
              <input type="text" name="gender" value={form.gender} onChange={handleChange} placeholder="ยังไม่ระบุ" />
            </label>
            <label className="ui-field profile-form-wide">
              ที่อยู่
              <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="ยังไม่ระบุ" />
            </label>
          </>
        )}
        <label className="ui-field profile-form-wide">
          แนะนำตัวสั้น ๆ
          <textarea name="bio" value={form.bio} onChange={handleChange} rows={2} maxLength={1000} placeholder="เช่น กำลังเรียนรู้ทักษะใหม่ และสร้างกิจวัตรที่เหมาะกับตัวเอง" />
        </label>
        {isUser && (
          <label className="ui-field profile-form-wide">
            ประสบการณ์ทำงาน
            <textarea name="experience" value={form.experience} onChange={handleChange} rows={2} maxLength={1000} placeholder="ยังไม่ระบุ" />
          </label>
        )}

        {user.role === "employer" && (
          <>
            <label className="ui-field">
              ชื่อบริษัท
              <input type="text" name="companyName" value={form.companyName} onChange={handleChange} required />
            </label>
            <label className="ui-field">
              ประเภทธุรกิจ
              <input type="text" name="businessType" value={form.businessType} onChange={handleChange} />
            </label>
            <label className="ui-field">
              เลขประจำตัวผู้เสียภาษี
              <input type="text" name="taxId" value={form.taxId} onChange={handleChange} />
            </label>
            <label className="ui-field">
              ที่อยู่บริษัท
              <input type="text" name="address" value={form.address} onChange={handleChange} />
            </label>
          </>
        )}

        {user.role === "counsellor" && (
          <>
            <label className="ui-field">
              ความเชี่ยวชาญ
              <input type="text" name="specialization" value={form.specialization} onChange={handleChange} placeholder="เช่น จิตแพทย์, นักจิตวิทยา" />
            </label>
            <label className="ui-field">
              สังกัดโรงพยาบาล
              <input type="text" name="hospital" value={form.hospital} onChange={handleChange} placeholder="เช่น โรงพยาบาลธัญญารักษ์ขอนแก่น" />
            </label>
          </>
        )}
      </div>

      <div className="profile-form-actions">
        <span className="ui-muted"><Lock size={14} aria-hidden="true" />คุณเลือกข้อมูลที่จะส่งตอนสมัครงานได้</span>
        <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="profile-page">
      <PageHeader icon={User} eyebrow="Your own story" description="จัดการข้อมูล เป้าหมาย และสิ่งที่คุณเลือกแบ่งปัน">โปรไฟล์ของฉัน</PageHeader>

      {profileCard}

      {message && <p className="profile-message" role="status">{message}</p>}
      {error && <p className="profile-error" role="alert">{error}</p>}

      {!isUser ? (
        <div className="profile-narrow">{personalForm}</div>
      ) : (
        <>
          <div className="ui-tabs" role="tablist" aria-label="ส่วนของโปรไฟล์">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" id={`profile-tab-${t.key}`} aria-selected={tab === t.key} aria-controls={`profile-panel-${t.key}`} className="ui-tab" onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`profile-panel-${tab}`} aria-labelledby={`profile-tab-${tab}`}>
            {tab === "overview" && (
              <div className="profile-split">
                <div className="profile-col">
                  <section className="ui-card profile-goals">
                    <div className="ui-card-head">
                      <h2>เป้าหมายที่มีความหมายกับฉัน</h2>
                      {!goalForm && (
                        <button type="button" className="ui-card-link" onClick={() => setGoalForm(activeGoals[0] ? { ...activeGoals[0], description: activeGoals[0].description || "" } : EMPTY_GOAL)}>
                          {activeGoals[0] ? "ปรับเป้าหมาย" : "ตั้งเป้าหมาย"}
                        </button>
                      )}
                    </div>

                    {goals === null ? <AsyncState /> : goalForm ? (
                      <form className="profile-goal-form" onSubmit={handleGoalSubmit}>
                        <label className="ui-field">
                          เป้าหมาย
                          <input type="text" value={goalForm.title} maxLength={200} onChange={(e) => setGoalForm((g) => ({ ...g, title: e.target.value }))} placeholder="เช่น มีกิจวัตรที่ดูแลตัวเองมากขึ้น" required />
                        </label>
                        <label className="ui-field">
                          เริ่มจากอะไร
                          <input type="text" value={goalForm.description} maxLength={2000} onChange={(e) => setGoalForm((g) => ({ ...g, description: e.target.value }))} placeholder="เช่น เริ่มจากกิจกรรมเล็ก ๆ ที่ทำได้ในแต่ละวัน" />
                        </label>
                        {goalForm._id && (
                          <label className="ui-field">
                            <span className="profile-goal-progress-label">ความคืบหน้า <b>{goalForm.progress}%</b></span>
                            <input type="range" min={0} max={100} step={10} value={goalForm.progress} onChange={(e) => setGoalForm((g) => ({ ...g, progress: e.target.value }))} />
                          </label>
                        )}
                        <div className="profile-goal-actions">
                          {goalForm._id && <button type="button" className="profile-goal-delete" onClick={() => handleGoalDelete(goalForm._id)}><Trash2 size={14} aria-hidden="true" />ลบ</button>}
                          <button type="button" className="ui-btn ui-btn-outline" onClick={() => setGoalForm(null)}>ยกเลิก</button>
                          <button type="submit" className="ui-btn ui-btn-primary" disabled={goalSaving}>{goalSaving ? "กำลังบันทึก..." : "บันทึก"}</button>
                        </div>
                      </form>
                    ) : activeGoals.length === 0 ? (
                      <div className="profile-goal-empty">
                        <p>ยังไม่มีเป้าหมาย ลองเริ่มจากสิ่งเล็ก ๆ ที่อยากทำให้ได้</p>
                        <button type="button" className="ui-btn ui-btn-outline" onClick={() => setGoalForm(EMPTY_GOAL)}><Plus size={15} aria-hidden="true" />ตั้งเป้าหมายแรก</button>
                      </div>
                    ) : (
                      <>
                        <ul className="profile-goal-list">
                          {activeGoals.map((goal) => (
                            <li key={goal._id}>
                              <button type="button" onClick={() => setGoalForm({ ...goal, description: goal.description || "" })}>
                                <span className="profile-goal-icon" aria-hidden="true"><Leaf size={20} /></span>
                                <span className="profile-goal-copy">
                                  <strong>{goal.title}</strong>
                                  {goal.description && <small>{goal.description}</small>}
                                </span>
                              </button>
                              <div className="profile-goal-progress">
                                <span className="ui-muted">ความคืบหน้า</span>
                                <b>{goal.progress}%</b>
                              </div>
                              <div className="ui-progress"><span style={{ width: `${goal.progress}%` }} /></div>
                            </li>
                          ))}
                        </ul>
                        <button type="button" className="profile-goal-add" onClick={() => setGoalForm(EMPTY_GOAL)}><Plus size={14} aria-hidden="true" />เพิ่มเป้าหมาย</button>
                      </>
                    )}
                    {doneGoals.length > 0 && !goalForm && <p className="ui-muted profile-goal-done">สำเร็จแล้ว {doneGoals.length} เป้าหมาย 🎉</p>}
                  </section>

                  <section className="ui-card profile-courses-card">
                    <div className="ui-card-head">
                      <h2>การเรียนรู้ของฉัน</h2>
                      <Link to="/learning" className="ui-card-link">ไปที่บทเรียน</Link>
                    </div>
                    {myCourses.length === 0 ? (
                      <p className="profile-empty-note">
                        ยังไม่มีคอร์สที่บันทึกไว้ — <Link to="/courses">ไปดูคอร์สเรียน</Link>
                      </p>
                    ) : (
                      <ul className="profile-courses-list">
                        {myCourses.map((enrollment) => (
                          <li key={enrollment._id}>
                            <span className="profile-courses-icon" aria-hidden="true"><BookOpen size={18} /></span>
                            <div className="profile-courses-body">
                              <Link to={`/courses/${enrollment.course._id}`} className="profile-courses-title">{enrollment.course.title}</Link>
                              <div className="profile-courses-status-row">
                                <StatusBadge status={enrollment.certificateUrl ? "completed" : "learning"} />
                                {enrollment.certificateUrl && (
                                  <a href={enrollment.certificateUrl} target="_blank" rel="noreferrer" className="profile-courses-cert-link">ดูเกียรติบัตร</a>
                                )}
                              </div>
                            </div>
                            <ChevronRight size={16} aria-hidden="true" />
                          </li>
                        ))}
                      </ul>
                    )}
                    {suggestedCourses.length > 0 && (
                      <>
                        <p className="profile-suggest-title">แนะนำสำหรับคุณ</p>
                        <ul className="profile-courses-list profile-courses-suggested">
                          {suggestedCourses.map((course) => (
                            <li key={course._id}>
                              <span className="profile-courses-icon" aria-hidden="true"><Sparkles size={18} /></span>
                              <div className="profile-courses-body">
                                <Link to={`/courses/${course._id}`} className="profile-courses-title">{course.title}</Link>
                                {course.category && <small className="ui-muted">{course.category}</small>}
                              </div>
                              <ChevronRight size={16} aria-hidden="true" />
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    <div className="profile-learn-links">
                      <Link to="/courses"><BookOpen size={16} aria-hidden="true" /><span><strong>ศูนย์การเรียนรู้</strong><small>คอร์สพัฒนาทักษะและอาชีพ</small></span><ChevronRight size={16} aria-hidden="true" /></Link>
                      <Link to="/learning"><Sparkles size={16} aria-hidden="true" /><span><strong>ฝึกทักษะการปฏิเสธ</strong><small>บทเรียนสั้นและสถานการณ์จำลอง</small></span><ChevronRight size={16} aria-hidden="true" /></Link>
                    </div>
                  </section>
                </div>

                <aside className="profile-col profile-col-side">
                  <GrowthCard streak={streak} />
                  <div className="ui-card profile-recovery">
                    <Heart size={18} aria-hidden="true" />
                    <div>
                      <strong>ระยะเวลาหลังสิ้นสุดการบำบัด</strong>
                      <p>{recoveryText()}</p>
                      {recovery?.endDate && <small>นับจาก {new Date(recovery.endDate).toLocaleDateString("th-TH")}</small>}
                    </div>
                  </div>
                  <p className="ui-muted profile-side-note"><Lock size={13} aria-hidden="true" />ข้อมูลการฟื้นฟูแยกจากโปรไฟล์สมัครงาน</p>
                </aside>
              </div>
            )}

            {tab === "skills" && (
              <div className="profile-grid-2">
                <section className="ui-card profile-skills-card">
                  <div className="ui-card-head">
                    <div>
                      <h2>ทักษะและความสามารถ</h2>
                      <p>ใช้เทียบกับทักษะที่ตำแหน่งงานต้องการ</p>
                    </div>
                    <Sparkles size={18} aria-hidden="true" />
                  </div>

                  <form className="profile-skill-add-form" onSubmit={handleAddSkill}>
                    <input
                      type="text"
                      list="profile-skill-options"
                      placeholder="เช่น Excel การจัดการเอกสาร"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      aria-label="ชื่อทักษะ"
                    />
                    <datalist id="profile-skill-options">
                      {availableSkills.map((skill) => (
                        <option key={skill._id} value={skill.skillName} />
                      ))}
                    </datalist>
                    <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} aria-label="ระดับความชำนาญ" className="profile-skill-level-select">
                      {LEVELS.map((n) => (
                        <option key={n} value={n}>ระดับ {n}</option>
                      ))}
                    </select>
                    <button type="submit" className="ui-btn ui-btn-primary">
                      <Plus size={15} />
                      <span>เพิ่มทักษะ</span>
                    </button>
                  </form>

                  {skillsLoading ? (
                    <AsyncState />
                  ) : (
                    <div className="profile-skill-chips">
                      {mySkills.map((item) => (
                        <span className="profile-skill-chip" key={item._id}>
                          <span className="profile-skill-chip-name">{item.skill.skillName}</span>
                          <select
                            value={item.level}
                            onChange={(e) => handleSkillLevelChange(item._id, e.target.value)}
                            className="profile-skill-chip-level"
                            aria-label={`ระดับความชำนาญของ ${item.skill.skillName}`}
                          >
                            {LEVELS.map((n) => (
                              <option key={n} value={n}>Lv.{n}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => handleRemoveSkill(item._id)} aria-label={`ลบทักษะ ${item.skill.skillName}`}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      {mySkills.length === 0 && <p className="profile-empty-note">ยังไม่มีทักษะ ลองเพิ่มดูสิ</p>}
                    </div>
                  )}
                  <p className="profile-tip"><Briefcase size={14} aria-hidden="true" />เพิ่มทักษะที่คุณมีจริง เพื่อให้การเทียบกับงานตรงขึ้น</p>
                </section>

                <section className="ui-card profile-resume">
                  <span className="profile-resume-icon" aria-hidden="true"><FileText size={20} /></span>
                  <h2>เรซูเม่ของฉัน</h2>
                  <p className="ui-muted">เก็บข้อมูลประสบการณ์และทักษะไว้พร้อมสมัครงาน</p>
                  {user.resumeUrl && (
                    <a href={user.resumeUrl} target="_blank" rel="noreferrer" className="profile-file-link">ดูเรซูเม่ปัจจุบัน</a>
                  )}
                  <button type="button" className="ui-btn ui-btn-outline" onClick={() => resumeInputRef.current?.click()} disabled={resumeUploading}>
                    <Plus size={15} aria-hidden="true" />
                    {resumeUploading ? "กำลังอัปโหลด..." : user.resumeUrl ? "เปลี่ยนไฟล์เรซูเม่" : "เลือกไฟล์เรซูเม่"}
                  </button>
                  <small className="ui-muted">PDF หรือ Word</small>
                  <input ref={resumeInputRef} type="file" accept="application/pdf,.doc,.docx" hidden onChange={handleResumeSelect} />
                </section>

                <section className="ui-card profile-edu">
                  <div className="ui-card-head">
                    <h2>การศึกษาและประสบการณ์</h2>
                    <button type="button" className="ui-card-link" onClick={() => setTab("personal")}>แก้ไขข้อมูล</button>
                  </div>
                  <dl className="profile-facts">
                    <div><dt>การศึกษา</dt><dd>{user.education || "ยังไม่ระบุ"}</dd></div>
                    <div><dt>ประสบการณ์</dt><dd>{user.experience || "ยังไม่ระบุ"}</dd></div>
                  </dl>
                </section>

                <section className="ui-card profile-certs">
                  <div className="ui-card-head">
                    <div>
                      <h2>ใบรับรองและใบเซอร์</h2>
                      <p>เพิ่มหลักฐานการเรียนรู้หรือการฝึกทักษะของคุณ</p>
                    </div>
                    <Award size={18} aria-hidden="true" />
                  </div>
                  {user.certificates?.length > 0 && (
                    <ul className="profile-cert-list">
                      {user.certificates.map((cert) => (
                        <li key={cert._id}>
                          <a href={cert.url} target="_blank" rel="noreferrer">{cert.name}</a>
                          <button type="button" onClick={() => handleRemoveCertificate(cert._id)} aria-label={`ลบใบเซอร์ ${cert.name}`}>
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="profile-cert-add">
                    <input type="text" placeholder="ชื่อใบรับรอง" aria-label="ชื่อใบรับรอง" value={certName} onChange={(e) => setCertName(e.target.value)} />
                    <button type="button" className="ui-btn ui-btn-outline" onClick={handleCertFilePick} disabled={certUploading}>
                      {certUploading ? "กำลังอัปโหลด..." : "เพิ่ม"}
                    </button>
                    <input ref={certInputRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden onChange={handleCertSelect} />
                  </div>
                </section>
              </div>
            )}

            {tab === "family" && (
              <div className="profile-split profile-split-even">
                <section className="ui-card profile-family-card">
                  <div className="ui-card-head">
                    <div>
                      <h2>คนที่คุณไว้ใจ</h2>
                      <p>เชื่อมสมาชิกครอบครัว 1 คน เพื่อร่วมให้กำลังใจ</p>
                    </div>
                    <Users size={18} aria-hidden="true" />
                  </div>

                  {familyError && <p className="profile-error">{familyError}</p>}

                  <form className="profile-family-invite-form" onSubmit={handleInviteFamily}>
                    <input type="email" placeholder="อีเมลของคนที่คุณต้องการเชิญ" aria-label="อีเมลของคนที่คุณต้องการเชิญ" value={familyEmail} onChange={(e) => setFamilyEmail(e.target.value)} required />
                    <button type="submit" className="ui-btn ui-btn-primary" disabled={familyInviting}>
                      <Mail size={15} aria-hidden="true" />
                      <span>{familyInviting ? "กำลังส่ง..." : "ส่งคำเชิญ"}</span>
                    </button>
                  </form>
                  <p className="ui-muted profile-family-hint">ระบบจะส่งลิงก์คำเชิญไปทางอีเมล ลิงก์มีอายุ 7 วัน</p>

                  {familyLinks.length > 0 && (
                    <ul className="profile-family-list">
                      {familyLinks.map((link) => (
                        <li key={link._id}>
                          <span>{link.inviteEmail}</span>
                          <span className={`profile-family-status profile-family-status-${link.status}`}>{FAMILY_STATUS_LABELS[link.status]}</span>
                          <button type="button" onClick={() => requestRevokeFamily(link)} aria-label="ยกเลิกการติดตาม">
                            <X size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {confirmDialog}

                  <h3 className="profile-sharing-title">เลือกสิ่งที่แบ่งปัน</h3>
                  <ul className="profile-sharing">
                    {SHARING_OPTIONS.map((opt) => {
                      const on = user.familySharing?.[opt.key] !== false;
                      return (
                        <li key={opt.key}>
                          <div>
                            <strong id={`share-${opt.key}`}>{opt.title}</strong>
                            <small>{opt.hint}</small>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            className="ui-switch"
                            aria-checked={on}
                            aria-labelledby={`share-${opt.key}`}
                            disabled={sharingSaving === opt.key}
                            onClick={() => handleToggleSharing(opt.key)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <aside className="ui-card ui-card-soft profile-privacy">
                  <span className="profile-privacy-icon" aria-hidden="true"><Lock size={18} /></span>
                  <h2>พื้นที่ส่วนตัวของคุณ</h2>
                  <p>บันทึกอารมณ์ ความอยากใช้สาร และผลแบบประเมิน ไม่ถูกแสดงต่อครอบครัวหรือนายจ้าง</p>
                  <hr className="ui-divider" />
                  <h3>คุณเลือกได้เสมอ</h3>
                  <p>ปรับขอบเขตหรือยกเลิกการเชื่อมครอบครัวได้ โดยยังใช้งานส่วนอื่นต่อได้ตามปกติ</p>
                  <hr className="ui-divider" />
                  <h3>ครอบครัวเห็นอะไรบ้าง</h3>
                  <ul className="profile-privacy-list">
                    <li className={user.familySharing?.progress !== false ? "is-on" : ""}>{user.familySharing?.progress !== false ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}เลเวล คะแนนกิจกรรม และวันต่อเนื่อง</li>
                    <li className={user.familySharing?.missions !== false ? "is-on" : ""}>{user.familySharing?.missions !== false ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}ภารกิจครอบครัวที่ทำร่วมกัน</li>
                    <li><X size={14} aria-hidden="true" />บันทึกอารมณ์และความอยากใช้สาร</li>
                    <li><X size={14} aria-hidden="true" />ผลประเมินความเสี่ยงและการให้คำปรึกษา</li>
                  </ul>
                </aside>
              </div>
            )}

            {tab === "personal" && <div className="profile-narrow">{personalForm}</div>}
          </div>
        </>
      )}
    </div>
  );
}

export default Profile;
