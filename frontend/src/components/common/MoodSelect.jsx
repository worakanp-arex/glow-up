import { useId } from "react";

const descriptions = {
  sad: "ไม่สดใส อยากมีคนรับฟัง", very_sad: "เศร้าหนัก รู้สึกรับมือได้ยาก",
  anxious: "กังวลใจ ไม่สบายใจ", panic: "ตื่นกลัว ใจสั่นอย่างฉับพลัน",
  overthinking: "คิดวน หยุดคิดได้ยาก", angry: "หงุดหงิด ไม่พอใจ",
  stressed: "กดดัน ผ่อนคลายได้ยาก", numb: "ว่างเปล่า ไม่ค่อยรู้สึกอะไร",
  other: "ยังอธิบายไม่ถูก หรือรู้สึกแบบอื่น",
};
const symbols = { sad: "😔", very_sad: "😢", anxious: "😟", panic: "😨", overthinking: "💭", angry: "😠", stressed: "😣", numb: "😶", other: "💬" };

export default function MoodSelect({ options, value, onChange }) {
  const id = useId();
  const selected = options.find(option => option.value === value);
  const Icon = selected?.icon;
  return <div className="mood-select">
    <select aria-label="ตอนนี้คุณรู้สึกอย่างไร" aria-describedby={id} value={value} onChange={event => onChange(event.target.value)} required>
      <option value="">เลือกความรู้สึกของคุณ</option>
      {options.map(option => <option key={option.value} value={option.value}>{symbols[option.value]} {option.label} — {descriptions[option.value]}</option>)}
    </select>
    <p id={id}>{Icon && <Icon size={20} aria-hidden="true" />}<span>{selected ? `${selected.label} · ${descriptions[value]}` : "เลือกข้อที่ใกล้เคียงกับความรู้สึกตอนนี้ที่สุด"}</span></p>
  </div>;
}
