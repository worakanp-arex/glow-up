import PageHeader from "../components/common/PageHeader.jsx";
import AsyncState from "../components/common/AsyncState.jsx";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Award, BookOpen, Briefcase, Check, ChevronRight, FileText, Heart, Leaf, Lock, Mail, Plus, Sparkles, Trash2, User, Users, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import * as userService from "../services/userService.js";
import * as skillService from "../services/skillService.js";
import * as emotionService from "../services/emotionService.js";
import * as courseService from "../services/courseService.js";
import * as familyService from "../services/familyService.js";
import * as goalService from "../services/goalService.js";
import * as gameService from "../services/gameService.js";
import StatusBadge from "../components/common/StatusBadge.jsx";
import FamilyMessageHistory from "../components/common/FamilyMessageHistory.jsx";
import GrowthCard from "../components/user/GrowthCard.jsx";
import RecoveryRadarChart from "../components/user/RecoveryRadarChart.jsx";
import ProfileHero from "../components/profile/ProfileHero.jsx";
import AvatarPickerDialog from "../components/profile/AvatarPickerDialog.jsx";
import AccountCard from "../components/profile/AccountCard.jsx";
import DeleteAccountCard from "../components/profile/DeleteAccountCard.jsx";
import FamilyConnectionsCard from "../components/profile/FamilyConnectionsCard.jsx";
import SkillPicker from "../components/profile/SkillPicker.jsx";
import useConfirmDialog from "../components/common/useConfirmDialog.jsx";
import { THAI_PROVINCES } from "../constants/provinces.js";
import { skillLevelLabel } from "../constants/skillLevels.js";
import SkillLevelDialog from "../components/profile/SkillLevelDialog.jsx";
import { roleHome } from "../constants/roleHome.js";
import { courseRange, courseStatus } from "../utils/courseDates.js";
import { getPreviousRoute } from "../utils/routeHistory.js";
import "./Profile.css";

const FAMILY_STATUS_LABELS = { pending: "รอการตอบรับ", requested: "ขอเชื่อมต่อ", active: "ติดตามอยู่" };

const ROLE_LABELS = {
  user: "ผู้ใช้งานปกติ",
  family: "ครอบครัว/ผู้ดูแล",
  employer: "นายจ้าง",
  admin: "ผู้ดูแลระบบ",
  counsellor: "บุคลากรทางการแพทย์",
};

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

const FORM_FIELDS = [
  "name", "nickname", "phone", "province", "bio", "age", "gender", "address", "education", "experience",
  "companyName", "businessType", "taxId", "website", "companySize", "companyDescription", "contactPosition",
  "specialization", "hospital", "position", "department",
];

function Profile() {
  const { user, updateUser } = useAuth();
  const isUser = user.role === "user";
  const [searchParams] = useSearchParams();
  // ?tab=skills เป็นต้น ให้หน้าอื่นลิงก์ตรงไปยังส่วนของโปรไฟล์ได้
  const [tab, setTab] = useState(() => {
    const requested = searchParams.get("tab");
    if (!isUser) return "personal";
    return TABS.some((t) => t.key === requested) ? requested : "overview";
  });
  const [form, setForm] = useState(() => Object.fromEntries(FORM_FIELDS.map((field) => [field, user[field] ?? ""])));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [pickerTab, setPickerTab] = useState(null);

  const [resumeUploading, setResumeUploading] = useState(false);
  const resumeInputRef = useRef(null);

  const [certName, setCertName] = useState("");
  const certInputRef = useRef(null);
  const [certUploading, setCertUploading] = useState(false);

  const [allSkills, setAllSkills] = useState([]);
  const [mySkills, setMySkills] = useState([]);
  const [levelPrompt, setLevelPrompt] = useState(null);
  const [skillsLoading, setSkillsLoading] = useState(isUser);

  const [recovery, setRecovery] = useState(null);
  const [recoveryError, setRecoveryError] = useState(false);
  const [streak, setStreak] = useState(null);
  const [radar, setRadar] = useState(null);
  const [myCourses, setMyCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);

  const [goals, setGoals] = useState(null);
  const [goalForm, setGoalForm] = useState(null);
  const [goalSaving, setGoalSaving] = useState(false);

  const [familyLinks, setFamilyLinks] = useState([]);
  const [familyEmail, setFamilyEmail] = useState("");
  const [familyInviting, setFamilyInviting] = useState(false);
  const [familyError, setFamilyError] = useState("");
  const [familyName, setFamilyName] = useState(user.familyName || "");
  const [familyNameSaving, setFamilyNameSaving] = useState(false);
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
    gameService.getMyRadar().then(setRadar).catch(() => setRadar(null));
    courseService.getMyCourses().then(setMyCourses).catch(() => setMyCourses([]));
    courseService.getCourses({ status: "active" }).then(setAllCourses).catch(() => setAllCourses([]));
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

  async function handleSaveFamilyName(e) {
    e.preventDefault();
    setFamilyNameSaving(true);
    setFamilyError("");
    try {
      const updated = await userService.updateMyProfile({ familyName: familyName.trim() });
      updateUser(updated);
      setFamilyName(updated.familyName || "");
    } catch (err) {
      setFamilyError(err.response?.data?.message || "บันทึกชื่อครอบครัวไม่สำเร็จ");
    } finally {
      setFamilyNameSaving(false);
    }
  }

  async function handleRespondFamily(link, approve) {
    setFamilyError("");
    try {
      await familyService.respondToFamilyRequest(link._id, approve);
      setFamilyLinks(await familyService.getMyInvitedFamily());
    } catch (err) {
      setFamilyError(err.response?.data?.message || "ดำเนินการไม่สำเร็จ");
    }
  }

  function linkLabel(link) {
    return link.familyUser?.name ? `${link.familyUser.name} (${link.inviteEmail})` : link.inviteEmail;
  }

  function requestRevokeFamily(link) {
    const isActive = link.status === "active";
    const isRequest = link.status === "requested";
    requestConfirm({
      title: isActive ? "ยกเลิกการติดตามของครอบครัวนี้?" : isRequest ? "ปฏิเสธคำขอนี้?" : "ยกเลิกคำเชิญนี้?",
      message: isActive
        ? `${linkLabel(link)} จะได้รับแจ้งเตือนว่าถูกลบออกจากการเชื่อมต่อ และจะไม่เห็นความคืบหน้าของคุณอีก`
        : isRequest
          ? `คำขอเชื่อมต่อจาก ${linkLabel(link)} จะถูกปฏิเสธ`
          : `คำเชิญไปยัง ${link.inviteEmail} จะถูกยกเลิก ลิงก์เดิมจะใช้งานไม่ได้อีก`,
      confirmLabel: "ยืนยัน",
      errorMessage: "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
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

  const ownedSkills = mySkills.filter((item) => item.skill);
  const ownedSkillIds = ownedSkills.map((item) => item.skill._id);

  // การเลือกทักษะที่มีอยู่แล้วจะลบออก การเลือกทักษะใหม่จะเปิด
  // ป๊อปอัปเลือกระดับ แทนการเพิ่มทันที
  async function handleToggleSkill(skill) {
    const existing = ownedSkills.find((item) => item.skill._id === skill._id);
    if (existing) {
      try {
        await skillService.removeMySkill(existing._id);
        setMySkills((prev) => prev.filter((item) => item._id !== existing._id));
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "บันทึกทักษะไม่สำเร็จ");
      }
      return;
    }
    setLevelPrompt({ mode: "add", skill });
  }

  async function handleAddSkillWithLevel(skill, level) {
    const created = await skillService.addMySkill({ skill: skill._id, level: Number(level) });
    setMySkills((prev) => [...prev, created]);
    setError("");
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
  // เติมการ์ดการเรียนรู้ให้ครบ 3 แถวด้วยคอร์สที่ผู้ใช้ยังไม่ได้บันทึก
  const enrolledIds = new Set(myCourses.map((e) => e.course?._id));
  const suggestedCourses = allCourses.filter((c) => !enrolledIds.has(c._id)).slice(0, Math.max(0, 3 - myCourses.length));
  const doneGoals = (goals || []).filter((g) => g.status === "completed");

  const text = (name, label, props = {}) => (
    <label className="ui-field">
      {label}
      <input type="text" name={name} value={form[name]} onChange={handleChange} {...props} />
    </label>
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

      <div className="profile-form-cols">
        <fieldset className="profile-fieldset">
          <legend>ข้อมูลทั่วไป</legend>
          {text("name", user.role === "employer" ? "ชื่อผู้ติดต่อ" : "ชื่อ-นามสกุล", { required: true })}
          {text("nickname", "ชื่อที่อยากให้เรียก", { placeholder: "เช่น ชื่อเล่น" })}
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
          <label className="ui-field">
            แนะนำตัวสั้น ๆ
            <textarea name="bio" value={form.bio} onChange={handleChange} rows={3} maxLength={1000} placeholder="เช่น กำลังเรียนรู้ทักษะใหม่ และสร้างกิจวัตรที่เหมาะกับตัวเอง" />
          </label>
        </fieldset>

        <fieldset className="profile-fieldset">
          <legend>
            {user.role === "employer" ? "ข้อมูลบริษัท" : user.role === "counsellor" ? "ข้อมูลวิชาชีพ" : user.role === "admin" ? "ข้อมูลการทำงาน" : "ข้อมูลเพิ่มเติม"}
          </legend>
          {(isUser || user.role === "family") && (
            <>
              <label className="ui-field">
                อายุ
                <input type="number" name="age" min={0} max={120} value={form.age} onChange={handleChange} placeholder="ยังไม่ระบุ" />
              </label>
              {text("gender", "เพศ", { placeholder: "ยังไม่ระบุ" })}
              {text("address", "ที่อยู่", { placeholder: "ยังไม่ระบุ" })}
            </>
          )}
          {isUser && (
            <>
              {text("education", "ระดับการศึกษา", { placeholder: "ยังไม่ระบุ" })}
              <label className="ui-field">
                ประสบการณ์ทำงาน
                <textarea name="experience" value={form.experience} onChange={handleChange} rows={3} maxLength={1000} placeholder="ยังไม่ระบุ" />
              </label>
            </>
          )}

          {user.role === "employer" && (
            <>
              {text("companyName", "ชื่อบริษัท", { required: true })}
              {text("businessType", "ประเภทธุรกิจ")}
              {text("taxId", "เลขประจำตัวผู้เสียภาษี")}
              {text("contactPosition", "ตำแหน่งของผู้ติดต่อ", { placeholder: "เช่น ผู้จัดการฝ่ายบุคคล" })}
              {text("companySize", "ขนาดบริษัท", { placeholder: "เช่น 11-50 คน" })}
              {text("website", "เว็บไซต์หรือช่องทางติดตามบริษัท", { placeholder: "https://" })}
              {text("address", "ที่อยู่บริษัท")}
              <label className="ui-field">
                แนะนำบริษัท
                <textarea name="companyDescription" value={form.companyDescription} onChange={handleChange} rows={3} maxLength={1000} placeholder="เล่าสั้น ๆ ว่าบริษัททำอะไร และบรรยากาศการทำงานเป็นอย่างไร" />
              </label>
            </>
          )}

          {user.role === "counsellor" && (
            <>
              {text("specialization", "ความเชี่ยวชาญ", { placeholder: "เช่น จิตแพทย์, นักจิตวิทยา" })}
              {text("hospital", "สังกัดโรงพยาบาล/หน่วยงาน", { placeholder: "เช่น โรงพยาบาลธัญญารักษ์ขอนแก่น" })}
              {text("education", "วุฒิการศึกษา", { placeholder: "ยังไม่ระบุ" })}
              <label className="ui-field">
                ประสบการณ์การทำงาน
                <textarea name="experience" value={form.experience} onChange={handleChange} rows={3} maxLength={1000} placeholder="ยังไม่ระบุ" />
              </label>
            </>
          )}

          {user.role === "admin" && (
            <>
              {text("position", "ตำแหน่ง", { placeholder: "เช่น ผู้ดูแลระบบหลัก" })}
              {text("department", "หน่วยงาน/ฝ่าย", { placeholder: "ยังไม่ระบุ" })}
            </>
          )}
        </fieldset>
      </div>

      <div className="profile-form-actions">
        <span className="ui-muted"><Lock size={14} aria-hidden="true" />ข้อมูลของคุณถูกเก็บเป็นความลับตามนโยบายความเป็นส่วนตัว</span>
        <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
        </button>
      </div>
    </form>
  );

  const backTo = getPreviousRoute("/profile") || roleHome(user.role);

  return (
    <div className="profile-page">
      <PageHeader icon={User} eyebrow="Your own story" description="จัดการข้อมูล เป้าหมาย และสิ่งที่คุณเลือกแบ่งปัน" backTo={backTo} backLabel="หน้าที่คุณเข้ามา">โปรไฟล์ของฉัน</PageHeader>

      <ProfileHero
        user={user}
        roleLabel={ROLE_LABELS[user.role]}
        onChangePicture={() => setPickerTab("characters")}
        onEditInfo={tab !== "personal" ? () => setTab("personal") : undefined}
      />
      {pickerTab && (
        <AvatarPickerDialog
          user={user}
          initialTab={pickerTab}
          onSaved={(updated) => { updateUser(updated); setPickerTab(null); }}
          onClose={() => setPickerTab(null)}
        />
      )}

      {message && <p className="profile-message" role="status">{message}</p>}
      {error && <p className="profile-error" role="alert">{error}</p>}

      {!isUser ? (
        <div className="profile-split">
          <div className="profile-col">{personalForm}</div>
          <AccountCard user={user} roleLabel={ROLE_LABELS[user.role]}>
            {user.role === "family" && <FamilyConnectionsCard />}
          </AccountCard>
        </div>
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

                  {Array.isArray(radar) && radar.length >= 3 && (
                    <section className="ui-card profile-radar-card" aria-label="พัฒนาการโดยรวม">
                      <RecoveryRadarChart data={radar} />
                    </section>
                  )}

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
                        {myCourses.map((enrollment) => {
                          const status = courseStatus(enrollment.course);
                          const range = courseRange(enrollment.course);
                          return (
                            <li key={enrollment._id}>
                              <span className="profile-courses-icon" aria-hidden="true"><BookOpen size={18} /></span>
                              <div className="profile-courses-body">
                                <Link to={`/courses/${enrollment.course._id}`} className="profile-courses-title">{enrollment.course.title}</Link>
                                {range && <small className="ui-muted">{range}</small>}
                                <div className="profile-courses-status-row">
                                  <StatusBadge status={enrollment.certificateUrl ? "completed" : "learning"} />
                                  {(status.state === "expired" || status.state === "expiring") && (
                                    <span className={`profile-courses-expiry is-${status.state}`}>{status.label}</span>
                                  )}
                                  {enrollment.certificateUrl && (
                                    <a href={enrollment.certificateUrl} target="_blank" rel="noreferrer" className="profile-courses-cert-link">ดูเกียรติบัตร</a>
                                  )}
                                </div>
                              </div>
                              <ChevronRight size={16} aria-hidden="true" />
                            </li>
                          );
                        })}
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

                  <div className="profile-skill-chips">
                    {ownedSkills.map((item) => (
                      <span className="profile-skill-chip" key={item._id}>
                        <span className="profile-skill-chip-name">{item.skill.skillName}</span>
                        <button
                          type="button"
                          className="profile-skill-chip-level"
                          onClick={() => setLevelPrompt({ mode: "edit", item })}
                          aria-label={`เปลี่ยนระดับความชำนาญของ ${item.skill.skillName}`}
                        >
                          {skillLevelLabel(item.level)}
                        </button>
                        <button type="button" onClick={() => handleRemoveSkill(item._id)} aria-label={`ลบทักษะ ${item.skill.skillName}`}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {ownedSkills.length === 0 && !skillsLoading && <p className="profile-empty-note">ยังไม่มีทักษะ เลือกจากรายการด้านล่างได้เลย</p>}
                  </div>

                  <SkillPicker skills={allSkills} selectedIds={ownedSkillIds} onToggle={handleToggleSkill} loading={skillsLoading} />
                  <p className="profile-tip"><Briefcase size={14} aria-hidden="true" />เพิ่มทักษะที่คุณมีจริง เพื่อให้การเทียบกับงานตรงขึ้น</p>

                  {levelPrompt && (
                    <SkillLevelDialog
                      skillName={levelPrompt.mode === "add" ? levelPrompt.skill.skillName : levelPrompt.item.skill.skillName}
                      initialLevel={levelPrompt.mode === "add" ? 3 : levelPrompt.item.level ?? 3}
                      onConfirm={(level) =>
                        levelPrompt.mode === "add"
                          ? handleAddSkillWithLevel(levelPrompt.skill, level)
                          : handleSkillLevelChange(levelPrompt.item._id, level)
                      }
                      onClose={() => setLevelPrompt(null)}
                    />
                  )}
                </section>

                <div className="profile-col">
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

                  <form className="profile-family-name-form" onSubmit={handleSaveFamilyName}>
                    <label className="ui-field">
                      ชื่อครอบครัวของคุณ
                      <input type="text" value={familyName} maxLength={100} onChange={(e) => setFamilyName(e.target.value)} placeholder="เช่น บ้านสุขใจ" />
                    </label>
                    <button type="submit" className="ui-btn ui-btn-outline" disabled={familyNameSaving || familyName.trim() === (user.familyName || "")}>
                      {familyNameSaving ? "กำลังบันทึก..." : "บันทึกชื่อ"}
                    </button>
                  </form>

                  <form className="profile-family-invite-form" onSubmit={handleInviteFamily}>
                    <input type="email" placeholder="อีเมลของคนที่คุณต้องการเชิญ" aria-label="อีเมลของคนที่คุณต้องการเชิญ" value={familyEmail} onChange={(e) => setFamilyEmail(e.target.value)} required />
                    <button type="submit" className="ui-btn ui-btn-primary" disabled={familyInviting}>
                      <Mail size={15} aria-hidden="true" />
                      <span>{familyInviting ? "กำลังส่ง..." : "ส่งคำเชิญ"}</span>
                    </button>
                  </form>
                  <p className="ui-muted profile-family-hint">ระบบจะส่งลิงก์คำเชิญไปทางอีเมล ลิงก์มีอายุ 7 วัน หรือรอให้สมาชิกครอบครัวขอเชื่อมต่อมาแล้วกดอนุมัติด้านล่าง</p>

                  {familyLinks.length > 0 && (
                    <ul className="profile-family-list">
                      {familyLinks.map((link) => (
                        <li key={link._id}>
                          <span>{linkLabel(link)}</span>
                          <span className={`profile-family-status profile-family-status-${link.status}`}>{FAMILY_STATUS_LABELS[link.status]}</span>
                          {link.status === "requested" && (
                            <button type="button" className="profile-family-approve" onClick={() => handleRespondFamily(link, true)}>
                              <Check size={13} aria-hidden="true" />อนุมัติ
                            </button>
                          )}
                          <button type="button" onClick={() => link.status === "requested" ? handleRespondFamily(link, false) : requestRevokeFamily(link)} aria-label={link.status === "requested" ? "ปฏิเสธคำขอ" : "ยกเลิกการติดตาม"}>
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

                <div className="profile-col">
                {familyLinks.some((link) => link.status === "active") && (
                  <FamilyMessageHistory linkId={familyLinks.find((link) => link.status === "active")._id} viewerRole="user" title="ข้อความจากครอบครัว" canReply />
                )}
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
              </div>
            )}

            {tab === "personal" && (
              <>
                {personalForm}
                <DeleteAccountCard user={user} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Profile;
