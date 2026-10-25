import { useState } from "react";
import { initials } from "../../utils/initials.js";
import { defaultAvatarSrc } from "../../utils/defaultAvatar.js";
import "./Avatar.css";

const DEFAULT_AVATAR_COLOR = "#287fc2";

// One place that decides how a person is pictured: a coloured letter when they
// chose the "initial" style (or when no picture can be shown), otherwise their
// picture, otherwise the role artwork. `user` needs name, role and the avatar
// fields (avatarUrl, avatarStyle, avatarColor); a missing user shows "?".
export default function Avatar({ user, size = 40, className = "", alt = "", fill = false }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const asLetter = user?.avatarStyle === "initial";
  const src = asLetter ? null : user?.avatarUrl || defaultAvatarSrc(user?.role);
  const showImage = Boolean(src) && failedSrc !== src;
  // `fill` lets a sized wrapper decide the dimensions; `size` then only scales the letter.
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
