import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CalendarHeart, CheckCircle2, Clock, Gamepad2, Heart, Lock, Check } from "lucide-react";
import * as emotionService from "../../services/emotionService.js";
import MoodFacePicker from "./MoodFacePicker.jsx";
import "./DailyCheckin.css";

const INITIAL_FORM = { happinessLevel: null, cravingLevel: 5, note: "" };

const NEXT_STEPS = [
  { to: "/craving-tracker", icon: CalendarHeart, title: "ดูปฏิทินความรู้สึก", hint: "แก้ไขบันทึกวันนี้ได้ที่นี่" },
  { to: "/games", icon: Gamepad2, title: "พักสักนิด มาเล่นกัน", hint: "เกมสั้น ๆ รับ XP" },
  { to: "/courses", icon: BookOpen, title: "เรียนรู้ต่อ", hint: "เรื่องที่ใช้ได้ในวันพรุ่งนี้" },
];

function DailyCheckin({ loggedToday, onLogged }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.happinessLevel) return;
    setSubmitting(true);
    try {
      await emotionService.logEmotion({ ...form, cravingLevel: Number(form.cravingLevel) });
      setJustLogged(true);
      setForm(INITIAL_FORM);
      const stats = await emotionService.getMyStreak();
      onLogged?.(stats);
    } finally {
      setSubmitting(false);
    }
  }

  const showDone = loggedToday || justLogged;

  return (
    <section className={`ui-card checkin${showDone ? " checkin-done" : ""}`}>
      {showDone ? (
        <>
          <div className="checkin-top">
            <span className="ui-chip"><Heart size={12} aria-hidden="true" />เช็คอินความรู้สึก</span>
            <span className="checkin-private"><Lock size={12} aria-hidden="true" />พื้นที่ส่วนตัว</span>
          </div>
          <div className="checkin-complete">
            <span className="checkin-complete-icon"><CheckCircle2 size={28} /></span>
            <div>
              <h2>เช็คอินวันนี้เรียบร้อยแล้ว</h2>
              <p>เก่งมาก! กลับมาใหม่พรุ่งนี้เพื่อรักษาสถิติของคุณไว้</p>
            </div>
          </div>
          <p className="checkin-next-title">ต่อจากนี้ ลองทำอะไรดี?</p>
          <div className="checkin-next">
            {NEXT_STEPS.map(({ to, icon: Icon, title, hint }) => (
              <Link key={to} to={to} className="checkin-next-item">
                <span aria-hidden="true"><Icon size={18} /></span>
                <strong>{title}</strong>
                <small>{hint}</small>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="checkin-top">
            <span className="ui-chip"><Heart size={12} aria-hidden="true" />เช็คอินความรู้สึก</span>
            <span className="checkin-private"><Lock size={12} aria-hidden="true" />พื้นที่ส่วนตัว</span>
          </div>
          <h2 className="checkin-title">วันนี้คุณรู้สึกอย่างไรบ้าง?</h2>
          <p className="checkin-sub">ไม่มีคำตอบที่ถูกหรือผิด เลือกความรู้สึกที่ใกล้กับคุณที่สุด</p>

          <form className="checkin-form" onSubmit={handleSubmit}>
            <MoodFacePicker value={form.happinessLevel} onChange={(level) => setForm((prev) => ({ ...prev, happinessLevel: level }))} />

            <CravingRange value={form.cravingLevel} onChange={handleChange} />

            <label className="checkin-note">
              <span>อยากเล่าอะไรเพิ่มเติมไหม <small>(ไม่บังคับ)</small></span>
              <textarea name="note" value={form.note} onChange={handleChange} rows={3} placeholder="วันนี้มีอะไรเกิดขึ้นกับคุณบ้าง..." />
            </label>

            <div className="checkin-foot">
              <span className="ui-muted"><Clock size={14} aria-hidden="true" />ใช้เวลาเพียง 1 นาที</span>
              <button type="submit" className="ui-btn ui-btn-primary" disabled={submitting || !form.happinessLevel}>
                <Check size={16} aria-hidden="true" />
                <span>{submitting ? "กำลังบันทึก..." : "บันทึกความรู้สึก"}</span>
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}

// Shared with the mood-tracker page so both forms look the same.
export function CravingRange({ value, onChange }) {
  return (
    <label className="checkin-range">
      <span className="checkin-range-head">
        <span>ความอยากใช้สาร</span>
        <span className="checkin-range-value"><b>{value}</b> / 10</span>
      </span>
      <input type="range" name="cravingLevel" min={1} max={10} value={value} onChange={onChange} style={{ "--fill": `${((value - 1) / 9) * 100}%` }} />
      <span className="checkin-range-scale" aria-hidden="true"><span>ไม่อยากเลย</span><span>อยากมาก</span></span>
    </label>
  );
}

export default DailyCheckin;
