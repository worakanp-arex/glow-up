import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus } from "lucide-react";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import Avatar from "../common/Avatar.jsx";
import CoverPicker, { coverStyle } from "../common/CoverPicker.jsx";
import * as userService from "../../services/userService.js";
import { shrinkImage, AVATAR_MAX_BYTES } from "../../utils/shrinkImage.js";
import { AVATAR_PRESETS, AVATAR_COLORS, COVER_PRESETS, DEFAULT_COVER_PRESET } from "../../constants/profileArt.js";
import "./AvatarPickerDialog.css";

const TABS = [
  { key: "characters", label: "ตัวละคร" },
  { key: "letters", label: "ตัวอักษร" },
  { key: "cover", label: "พื้นหลัง" },
  { key: "gallery", label: "จากแกลเลอรี" },
];


// Picks a profile picture (a ready-made character, a coloured letter, or a
// photo from the gallery as the last resort) and the cover behind the profile
// card, with a live preview. Nothing is saved until "บันทึก" is pressed.
export default function AvatarPickerDialog({ user, initialTab = "characters", onSaved, onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [choice, setChoice] = useState(() =>
    user.avatarStyle === "initial"
      ? { type: "initial", color: user.avatarColor || AVATAR_COLORS[0] }
      : { type: "keep" }
  );
  const [coverKey, setCoverKey] = useState(user.coverPreset || DEFAULT_COVER_PRESET);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview); }, [filePreview]);

  const preset = choice.type === "preset" ? AVATAR_PRESETS.find((item) => item.key === choice.key) : null;
  const previewUser = {
    name: user.name,
    role: user.role,
    avatarUrl: choice.type === "gallery" ? filePreview : preset ? preset.url : user.avatarUrl,
    avatarStyle: choice.type === "initial" ? "initial" : "image",
    avatarColor: choice.type === "initial" ? choice.color : user.avatarColor,
  };
  const cover = COVER_PRESETS.find((item) => item.key === coverKey) || COVER_PRESETS[0];
  const coverChanged = coverKey !== (user.coverPreset || DEFAULT_COVER_PRESET);
  const avatarChanged = choice.type !== "keep" && !(choice.type === "initial" && user.avatarStyle === "initial" && choice.color === user.avatarColor);
  const nothingToSave = !avatarChanged && !coverChanged;

  async function handleFile(event) {
    const original = event.target.files[0];
    event.target.value = "";
    if (!original) return;
    const picked = await shrinkImage(original);
    if (picked.size > AVATAR_MAX_BYTES) {
      setError("รูปต้องมีขนาดไม่เกิน 2 MB");
      return;
    }
    setError("");
    setFile(picked);
    setFilePreview(URL.createObjectURL(picked));
    setChoice({ type: "gallery" });
  }

  async function handleSave() {
    setBusy(true);
    setError("");
    try {
      let updated = user;
      if (choice.type === "gallery" && file) {
        updated = await userService.uploadMyAvatar(file);
      }
      const changes = {};
      if (choice.type === "preset") changes.avatarPreset = choice.key;
      if (choice.type === "initial") Object.assign(changes, { avatarStyle: "initial", avatarColor: choice.color });
      if (coverChanged) changes.coverPreset = coverKey;
      if (Object.keys(changes).length > 0) updated = await userService.updateMyProfile(changes);
      onSaved(updated);
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      title="เปลี่ยนรูปโปรไฟล์"
      confirmLabel="บันทึก"
      busy={busy}
      error={error}
      confirmDisabled={nothingToSave}
      onConfirm={handleSave}
      onClose={onClose}
      wide
    >
      <div className="avatar-picker-preview" style={coverStyle(cover)}>
        <Avatar user={previewUser} size={88} alt="ตัวอย่างรูปโปรไฟล์" className="avatar-picker-preview-avatar" />
      </div>

      <div className="ui-tabs avatar-picker-tabs" role="tablist" aria-label="ประเภทรูปโปรไฟล์">
        {TABS.map((item) => (
          <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className="ui-tab" onClick={() => setTab(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "characters" && (
        <ul className="avatar-picker-grid" aria-label="เลือกตัวละคร">
          {AVATAR_PRESETS.map((item) => {
            const selected = choice.type === "preset" && choice.key === item.key;
            return (
              <li key={item.key}>
                <button type="button" className={`avatar-picker-option${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={() => setChoice({ type: "preset", key: item.key })}>
                  <span className="avatar-picker-thumb"><img src={item.url} alt="" loading="lazy" /></span>
                  <span>{item.label}</span>
                  {selected && <span className="avatar-picker-check" aria-hidden="true"><Check size={13} /></span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "letters" && (
        <div className="avatar-picker-letters">
          <p className="ui-muted">ใช้ตัวอักษรแรกของชื่อเป็นรูปโปรไฟล์ แล้วเลือกสีที่ชอบ</p>
          <ul className="avatar-picker-swatches" aria-label="เลือกสี">
            {AVATAR_COLORS.map((color) => {
              const selected = choice.type === "initial" && choice.color === color;
              return (
                <li key={color}>
                  <button type="button" className={`avatar-picker-swatch${selected ? " is-selected" : ""}`} style={{ background: color }} aria-label={`สี ${color}`} aria-pressed={selected} onClick={() => setChoice({ type: "initial", color })}>
                    {selected && <Check size={16} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tab === "cover" && (
        <CoverPicker options={COVER_PRESETS.map((item) => ({ ...item, group: item.kind === "image" ? "ภาพประกอบ" : "สีไล่เฉด" }))} value={coverKey} onChange={setCoverKey} label="เลือกพื้นหลังโปรไฟล์" />
      )}

      {tab === "gallery" && (
        <div className="avatar-picker-gallery">
          <p className="ui-muted">ถ้าอยากใช้รูปของตัวเอง เลือกไฟล์ภาพ (JPG, PNG หรือ WebP ขนาดไม่เกิน 2 MB)</p>
          <button type="button" className="ui-btn ui-btn-outline" onClick={() => fileInput.current?.click()}>
            <ImagePlus size={16} aria-hidden="true" />{file ? "เลือกรูปอื่น" : "เลือกรูปจากเครื่อง"}
          </button>
          {file && <p className="avatar-picker-file">{file.name}</p>}
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleFile} />
        </div>
      )}
    </ConfirmDialog>
  );
}
