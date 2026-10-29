import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ICON_OPTIONS, resolveIcon } from "../../utils/lucideIcon.js";
import "./IconPicker.css";

// แสดงไอคอนจริง (ไม่ใช่ชื่อรหัส): ปุ่มที่แสดงไอคอนปัจจุบัน
// เปิดตารางไอคอนทั้งหมดที่มีพร้อมป้ายชื่อภาษาไทย
export default function IconPicker({ value, onChange, label = "ไอคอน", allowNone = false }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const Current = resolveIcon(value);
  const currentLabel = ICON_OPTIONS.find((option) => option.name === value)?.label;

  return (
    <div className="icon-picker">
      <span className="icon-picker-label">{label}</span>
      <button
        type="button"
        className="icon-picker-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="icon-picker-current" aria-hidden="true"><Current size={20} /></span>
        <span className="icon-picker-name">{currentLabel || (value ? value : "ยังไม่ได้เลือกไอคอน")}</span>
        <ChevronDown size={16} aria-hidden="true" className={open ? "is-open" : ""} />
      </button>
      {open && (
        <div className="icon-picker-panel" id={panelId} role="group" aria-label={`เลือก${label}`}>
          {allowNone && (
            <button type="button" className={`icon-picker-option${!value ? " is-selected" : ""}`} aria-pressed={!value} onClick={() => { onChange(""); setOpen(false); }}>
              <span aria-hidden="true">–</span>
              <small>ไม่ใช้</small>
            </button>
          )}
          {ICON_OPTIONS.map(({ name, label: optionLabel, Icon }) => (
            <button
              key={name}
              type="button"
              className={`icon-picker-option${value === name ? " is-selected" : ""}`}
              aria-pressed={value === name}
              title={optionLabel}
              onClick={() => { onChange(name); setOpen(false); }}
            >
              <Icon size={22} aria-hidden="true" />
              <small>{optionLabel}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
