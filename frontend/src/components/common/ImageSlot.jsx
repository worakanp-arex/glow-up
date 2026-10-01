import { useState } from "react";
import "./ImageSlot.css";

// An <img> reserved for artwork that gets added later (see public/images/README.md).
// Until the file exists the slot keeps its size and shows a soft tinted
// background instead of a broken-image icon.
export default function ImageSlot({ src, alt = "", className = "", tone = "primary" }) {
  const [missing, setMissing] = useState(false);
  return (
    <div className={`image-slot image-slot-${tone}${missing ? " is-missing" : ""} ${className}`.trim()}>
      <img src={src} alt={alt} loading="lazy" onError={() => setMissing(true)} />
    </div>
  );
}
