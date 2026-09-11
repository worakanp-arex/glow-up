import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BookOpen,
  Camera,
  FileText,
  Heart,
  Mail,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import * as userService from "../services/userService.js";
import * as skillService from "../services/skillService.js";
import * as emotionService from "../services/emotionService.js";
import * as courseService from "../services/courseService.js";
import * as familyService from "../services/familyService.js";
import StatusBadge from "../components/common/StatusBadge.jsx";
import StreakWidget from "../components/user/StreakWidget.jsx";
import "./Profile.css";

const FAMILY_STATUS_LABELS = { pending: "รอการตอบรับ", active: "ติดตามอยู่", revoked: "ยกเลิกแล้ว" };

const ROLE_LABELS = {
  user: "ผู้หางาน",
  employer: "นายจ้าง",
  admin: "ผู้ดูแลระบบ",
  counsellor: "บุคลากรทางการแพทย์",
};
const LEVELS = [1, 2, 3, 4, 5];

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
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
  const [skillsLoading, setSkillsLoading] = useState(user.role === "user");

  const [streak, setStreak] = useState(null);
  const [myCourses, setMyCourses] = useState([]);

  const [familyLinks, setFamilyLinks] = useState([]);
  const [familyEmail, setFamilyEmail] = useState("");
  const [familyInviting, setFamilyInviting] = useState(false);
  const [familyError, setFamilyError] = useState("");

  useEffect(() => {
    if (user.role !== "user") return;
    Promise.all([skillService.getSkills(), skillService.getMySkills()])
      .then(([skills, mine]) => {
        setAllSkills(skills);
        setMySkills(mine);
      })
      .finally(() => setSkillsLoading(false));
  }, [user.role]);

  useEffect(() => {
    if (user.role !== "user") return;
    emotionService.getMyStreak().then(setStreak).catch(() => setStreak(null));
  }, [user.role]);

  useEffect(() => {
    if (user.role !== "user") return;
    courseService.getMyCourses().then(setMyCourses).catch(() => setMyCourses([]));
  }, [user.role]);

  useEffect(() => {
    if (user.role !== "user") return;
    familyService.getMyInvitedFamily().then(setFamilyLinks).catch(() => setFamilyLinks([]));
  }, [user.role]);

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

  async function handleRevokeFamily(id) {
    const updated = await familyService.revokeFamilyLink(id);
    setFamilyLinks((prev) => prev.map((link) => (link._id === id ? updated : link)));
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

  return (
    <div className="profile-page">
      <h1>
        <User size={22} />
        <span>โปรไฟล์ของฉัน</span>
      </h1>

      {message && <p className="profile-message">{message}</p>}
      {error && <p className="profile-error">{error}</p>}

      <div className="profile-top-row">
        <div className="profile-banner-card">
          <div className="profile-banner-top" />
          <button
            type="button"
            className="profile-banner-avatar"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="รูปโปรไฟล์" />
            ) : (
              <span className="profile-avatar-fallback">{initials(user.name)}</span>
            )}
            <span className="profile-avatar-overlay">
              <Camera size={14} />
            </span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={handleAvatarSelect}
          />

          <div className="profile-banner-body">
            <h2 className="profile-banner-name">{user.name || "-"}</h2>
            <div className="profile-banner-badges">
              <span className="profile-role-badge">{ROLE_LABELS[user.role]}</span>
              <StatusBadge status={user.verifiedStatus} />
            </div>
            <ul className="profile-banner-meta">
              <li>
                <Mail size={14} />
                <span>{user.email}</span>
              </li>
              {user.phone && (
                <li>
                  <Phone size={14} />
                  <span>{user.phone}</span>
                </li>
              )}
              {user.address && (
                <li>
                  <MapPin size={14} />
                  <span>{user.address}</span>
                </li>
              )}
            </ul>
            <p className="profile-avatar-hint">
              {avatarUploading ? "กำลังอัปโหลดรูป..." : "คลิกที่รูปเพื่อเปลี่ยนรูปโปรไฟล์"}
            </p>
          </div>
        </div>

        {user.role === "user" && (
          <div className="profile-top-right">
            <div className="profile-card profile-skills-card">
              <h2>
                <Sparkles size={18} />
                <span>ทักษะและความสามารถ</span>
                <span className="profile-skills-hint">(สำหรับวิเคราะห์ AI)</span>
              </h2>

              <form className="profile-skill-add-form" onSubmit={handleAddSkill}>
                <input
                  type="text"
                  list="profile-skill-options"
                  placeholder="พิมพ์ชื่อทักษะที่ต้องการเพิ่ม..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                />
                <datalist id="profile-skill-options">
                  {availableSkills.map((skill) => (
                    <option key={skill._id} value={skill.skillName} />
                  ))}
                </datalist>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value)}
                  aria-label="ระดับความชำนาญ"
                  className="profile-skill-level-select"
                >
                  {LEVELS.map((n) => (
                    <option key={n} value={n}>
                      ระดับ {n}
                    </option>
                  ))}
                </select>
                <button type="submit">
                  <Plus size={14} />
                  <span>เพิ่ม</span>
                </button>
              </form>

              {skillsLoading ? (
                <p>กำลังโหลด...</p>
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
                          <option key={n} value={n}>
                            Lv.{n}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => handleRemoveSkill(item._id)} aria-label="ลบทักษะ">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {mySkills.length === 0 && <p className="profile-empty-note">ยังไม่มีทักษะ ลองเพิ่มดูสิ</p>}
                </div>
              )}
            </div>

            {streak && <StreakWidget streak={streak} />}
          </div>
        )}
      </div>

      {user.role === "user" && (
        <div className="profile-documents-row">
          <div className="profile-card">
            <h2>
              <FileText size={18} />
              <span>เรซูเม่</span>
            </h2>
            {user.resumeUrl ? (
              <a href={user.resumeUrl} target="_blank" rel="noreferrer" className="profile-file-link">
                ดูเรซูเม่ปัจจุบัน
              </a>
            ) : (
              <p className="profile-empty-note">ยังไม่ได้อัปโหลดเรซูเม่</p>
            )}
            <button
              type="button"
              className="profile-upload-button"
              onClick={() => resumeInputRef.current?.click()}
              disabled={resumeUploading}
            >
              {resumeUploading ? "กำลังอัปโหลด..." : user.resumeUrl ? "เปลี่ยนไฟล์" : "อัปโหลดเรซูเม่"}
            </button>
            <input
              ref={resumeInputRef}
              type="file"
              accept="application/pdf,.doc,.docx"
              hidden
              onChange={handleResumeSelect}
            />
          </div>

          <div className="profile-card">
            <h2>
              <Award size={18} />
              <span>ใบรับรอง / ใบเซอร์</span>
            </h2>
            <ul className="profile-cert-list">
              {user.certificates?.map((cert) => (
                <li key={cert._id}>
                  <a href={cert.url} target="_blank" rel="noreferrer">
                    {cert.name}
                  </a>
                  <button type="button" onClick={() => handleRemoveCertificate(cert._id)} aria-label="ลบใบเซอร์">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
              {(!user.certificates || user.certificates.length === 0) && (
                <p className="profile-empty-note">ยังไม่มีใบเซอร์</p>
              )}
            </ul>
            <div className="profile-cert-add">
              <input
                type="text"
                placeholder="ชื่อใบเซอร์ เช่น TOEIC"
                value={certName}
                onChange={(e) => setCertName(e.target.value)}
              />
              <button type="button" onClick={handleCertFilePick} disabled={certUploading}>
                <Plus size={14} />
                <span>{certUploading ? "กำลังอัปโหลด..." : "เพิ่ม"}</span>
              </button>
              <input
                ref={certInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                hidden
                onChange={handleCertSelect}
              />
            </div>
          </div>
        </div>
      )}

      {user.role === "user" && (
        <div className="profile-card profile-courses-card">
          <h2>
            <BookOpen size={18} />
            <span>คอร์สเรียนของฉัน</span>
          </h2>
          {myCourses.length === 0 ? (
            <p className="profile-empty-note">
              ยังไม่มีคอร์สที่บันทึกไว้ — <Link to="/courses">ไปดูคอร์สเรียน</Link>
            </p>
          ) : (
            <ul className="profile-courses-list">
              {myCourses.map((enrollment) => (
                <li key={enrollment._id}>
                  <Link to={`/courses/${enrollment.course._id}`} className="profile-courses-title">
                    {enrollment.course.title}
                  </Link>
                  <div className="profile-courses-status-row">
                    <StatusBadge status={enrollment.certificateUrl ? "completed" : "learning"} />
                    {enrollment.certificateUrl && (
                      <a
                        href={enrollment.certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="profile-courses-cert-link"
                      >
                        ดูเกียรติบัตร
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {user.role === "user" && (
        <div className="profile-card profile-family-card">
          <h2>
            <Heart size={18} />
            <span>ครอบครัว/ผู้ดูแลที่ติดตามความคืบหน้า</span>
          </h2>
          <p className="profile-family-hint">
            เชิญสมาชิกครอบครัว 1 คนเพื่อติดตามความคืบหน้าแบบจำกัดสิทธิ์ — เห็นแค่ระดับความสำเร็จ
            ไม่เห็นข้อมูลสุขภาพโดยละเอียด
          </p>

          {familyError && <p className="profile-error">{familyError}</p>}

          <form className="profile-family-invite-form" onSubmit={handleInviteFamily}>
            <input
              type="email"
              placeholder="อีเมลของสมาชิกครอบครัว"
              value={familyEmail}
              onChange={(e) => setFamilyEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={familyInviting}>
              <Plus size={14} />
              <span>{familyInviting ? "กำลังส่ง..." : "เชิญ"}</span>
            </button>
          </form>

          <ul className="profile-family-list">
            {familyLinks.map((link) => (
              <li key={link._id}>
                <span>{link.inviteEmail}</span>
                <span className="profile-family-status">{FAMILY_STATUS_LABELS[link.status]}</span>
                {link.status !== "revoked" && (
                  <button type="button" onClick={() => handleRevokeFamily(link._id)} aria-label="ยกเลิกการติดตาม">
                    <X size={12} />
                  </button>
                )}
              </li>
            ))}
            {familyLinks.length === 0 && <p className="profile-empty-note">ยังไม่มีสมาชิกครอบครัวที่เชิญ</p>}
          </ul>
        </div>
      )}

      <form className="profile-form-row" onSubmit={handleSubmit}>
        <div className="profile-card">
          <h2>ข้อมูลส่วนตัวทั่วไป</h2>
          <label>
            {user.role === "employer" ? "ชื่อผู้ติดต่อ" : "ชื่อ-นามสกุล"}
            <input type="text" name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            เบอร์โทรศัพท์
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} />
          </label>

          {user.role === "user" && (
            <>
              <label>
                อายุ
                <input type="number" name="age" min={0} value={form.age} onChange={handleChange} />
              </label>
              <label>
                เพศ
                <input type="text" name="gender" value={form.gender} onChange={handleChange} />
              </label>
              <label>
                ที่อยู่
                <input type="text" name="address" value={form.address} onChange={handleChange} />
              </label>
            </>
          )}
        </div>

        {user.role === "user" ? (
          <div className="profile-card">
            <h2>การศึกษาและประสบการณ์</h2>
            <label>
              ระดับการศึกษา
              <input type="text" name="education" value={form.education} onChange={handleChange} />
            </label>
            <label>
              ประสบการณ์ทำงาน
              <input type="text" name="experience" value={form.experience} onChange={handleChange} />
            </label>
          </div>
        ) : user.role === "employer" ? (
          <div className="profile-card">
            <h2>ข้อมูลบริษัท</h2>
            <label>
              ชื่อบริษัท
              <input
                type="text"
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              ประเภทธุรกิจ
              <input type="text" name="businessType" value={form.businessType} onChange={handleChange} />
            </label>
            <label>
              เลขประจำตัวผู้เสียภาษี
              <input type="text" name="taxId" value={form.taxId} onChange={handleChange} />
            </label>
            <label>
              ที่อยู่บริษัท
              <input type="text" name="address" value={form.address} onChange={handleChange} />
            </label>
          </div>
        ) : user.role === "counsellor" ? (
          <div className="profile-card">
            <h2>ข้อมูลวิชาชีพ</h2>
            <label>
              ความเชี่ยวชาญ
              <input
                type="text"
                name="specialization"
                value={form.specialization}
                onChange={handleChange}
                placeholder="เช่น จิตแพทย์, นักจิตวิทยา"
              />
            </label>
            <label>
              สังกัดโรงพยาบาล
              <input
                type="text"
                name="hospital"
                value={form.hospital}
                onChange={handleChange}
                placeholder="เช่น โรงพยาบาลธัญญารักษ์ขอนแก่น"
              />
            </label>
          </div>
        ) : null}

        <div className="profile-form-actions">
          <button type="submit" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Profile;
