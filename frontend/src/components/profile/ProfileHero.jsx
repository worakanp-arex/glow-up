import { Camera, MapPin, Pencil } from "lucide-react";
import Avatar from "../common/Avatar.jsx";
import StatusBadge from "../common/StatusBadge.jsx";
import { coverStyle } from "../common/CoverPicker.jsx";
import { COVER_PRESETS, DEFAULT_COVER_PRESET } from "../../constants/profileArt.js";
import "./ProfileHero.css";

// ปกกว้างโดยรูปของบุคคลซ้อนที่ขอบล่างซ้าย ชื่อ
// และป้ายอยู่ข้างๆ และปุ่ม "เปลี่ยนรูป" อยู่ด้านขวา
export default function ProfileHero({ user, roleLabel, onChangePicture, onEditInfo }) {
  const cover = COVER_PRESETS.find((item) => item.key === (user.coverPreset || DEFAULT_COVER_PRESET)) || COVER_PRESETS[0];

  return (
    <section className="ui-card profile-hero" aria-label="โปรไฟล์ของฉัน">
      <div className="profile-hero-cover" style={coverStyle(cover)} />
      <div className="profile-hero-main">
        <button
          type="button"
          className="profile-banner-avatar"
          aria-label="เปลี่ยนรูปโปรไฟล์"
          title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์"
          onClick={onChangePicture}
        >
          <Avatar user={user} size={132} alt="รูปโปรไฟล์" />
          <span className="profile-avatar-overlay" aria-hidden="true"><Camera size={15} /></span>
        </button>

        <div className="profile-hero-body">
          <h2 className="profile-banner-name">{user.name || "-"}</h2>
          {user.nickname && <p className="profile-hero-nickname">{user.nickname}</p>}
          <div className="profile-banner-badges">
            <span className="profile-role-badge">{roleLabel}</span>
            <StatusBadge status={user.verifiedStatus} />
            {user.province && <span className="ui-chip ui-chip-neutral"><MapPin size={12} aria-hidden="true" />{user.province}</span>}
          </div>
          {user.bio && <p className="profile-hero-bio">{user.bio}</p>}
        </div>

        <div className="profile-hero-actions">
          <button type="button" className="ui-btn ui-btn-outline profile-edit-photo" onClick={onChangePicture}>
            <Pencil size={15} aria-hidden="true" />เปลี่ยนรูปโปรไฟล์
          </button>
          {onEditInfo && (
            <button type="button" className="ui-btn ui-btn-outline profile-edit-btn" onClick={onEditInfo}>
              แก้ไขข้อมูล
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
