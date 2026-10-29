import { useState } from "react";
import "./ImageSlot.css";

// <img> ที่สงวนไว้สำหรับภาพที่จะเพิ่มภายหลัง (ดู public/images/README.md)
// จนกว่าไฟล์จะมีอยู่ ช่องจะคงขนาดและแสดงพื้นหลังสีอ่อน
// แทนไอคอนรูปภาพเสีย
export default function ImageSlot({ src, alt = "", className = "", tone = "primary" }) {
  const [missing, setMissing] = useState(false);
  return (
    <div className={`image-slot image-slot-${tone}${missing ? " is-missing" : ""} ${className}`.trim()}>
      <img src={src} alt={alt} loading="lazy" onError={() => setMissing(true)} />
    </div>
  );
}
