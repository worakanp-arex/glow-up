import { useState } from "react";
import { initials } from "../../utils/initials.js";
import { defaultAvatarSrc } from "../../utils/defaultAvatar.js";
import "./Avatar.css";

const DEFAULT_AVATAR_COLOR = "#287fc2";

// ที่เดียวที่ตัดสินว่าจะแสดงภาพของบุคคลอย่างไร: ตัวอักษรสีเมื่อเขาเลือก
// สไตล์ "initial" (หรือเมื่อแสดงรูปไม่ได้) มิฉะนั้นแสดงรูปของเขา
// และถ้าไม่มีก็แสดงภาพประจำบทบาท `user` ต้องมีชื่อ บทบาท และฟิลด์
// อวาตาร์ (avatarUrl, avatarStyle, avatarColor) ถ้าไม่มี user จะแสดง "?"
export default function Avatar({ user, size = 40, className = "", alt = "", fill = false }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const asLetter = user?.avatarStyle === "initial";
  const src = asLetter ? null : user?.avatarUrl || defaultAvatarSrc(user?.role);
  const showImage = Boolean(src) && failedSrc !== src;
  // `fill` ให้กรอบที่กำหนดขนาดไว้เป็นผู้ตัดสินมิติ ส่วน `size` จะปรับขนาดเฉพาะตัวอักษร
  const style = { width: fill ? "100%" : size, height: fill ? "100%" : size, fontSize: Math.round(size * 0.42) };

  if (showImage) {
    return (
      <span className={`avatar ${className}`.trim()} style={style}>
        <img src={src} alt={alt} onError={() => setFailedSrc(src)} />
      </span>
    );
  }
  return (
    <span
      className={`avatar avatar-letter ${className}`.trim()}
      style={{ ...style, background: user?.avatarColor || DEFAULT_AVATAR_COLOR }}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      {initials(user?.name)}
    </span>
  );
}
