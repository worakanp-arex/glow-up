import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { HAPPINESS_LEVELS, happinessByLevel } from "../../constants/happiness.js";
import { CONTEXT_OPTIONS } from "../../constants/emotionContext.js";
import * as emotionService from "../../services/emotionService.js";
import "./BackfillEmotionModal.css";

function formatThaiFullDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(y, m - 1, d)
  );
}

function BackfillEmotionModal({ dateKey, existingLog, onClose, onSaved }) {
  const [happinessLevel, setHappinessLevel] = useState(existingLog?.happinessLevel || null);
  const [cravingLevel, setCravingLevel] = useState(existingLog?.cravingLevel ?? 5);
  const [context, setContext] = useState(existingLog?.context || "work");
  const [note, setNote] = useState(existingLog?.note || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  async function handleSave(e) {
    e.preventDefault();
    if (!happinessLevel) {
      setError("กรุณาเลือกระดับความสุข");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const log = await emotionService.logEmotion({
        happinessLevel,
        cravingLevel: Number(cravingLevel),
        context,
        note,
        dateKey,
      });
      onSaved(log);
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="backfill-modal-overlay" onClick={onClose}>
      <div className="backfill-modal" onClick={(e) => e.stopPropagation()}>
        <div className="backfill-modal-header">
          <h2>บันทึกย้อนหลัง: {formatThaiFullDate(dateKey)}</h2>
          <button type="button" className="backfill-modal-close" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </div>
        <p className="backfill-modal-hint">
          กรอกความรู้สึกของคุณในวันนี้ย้อนหลัง เพื่อให้ข้อมูลครบถ้วนสำหรับการวิเคราะห์
        </p>

        <form onSubmit={handleSave}>
          <div className="backfill-modal-field">
            <span>วันนั้นคุณรู้สึกอย่างไร</span>
            <div className="backfill-modal-happiness-picker" role="radiogroup" aria-label="ระดับความสุข">
              {HAPPINESS_LEVELS.map(({ level, label, icon: Icon, color }) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={happinessLevel === level}
                  title={label}
                  className={`backfill-modal-happiness-btn${happinessLevel === level ? " active" : ""}`}
                  style={{ "--happiness-color": color }}
                  onClick={() => setHappinessLevel(level)}
                >
                  <Icon size={20} />
                </button>
              ))}
            </div>
            <span className="backfill-modal-happiness-label">
              {happinessLevel ? happinessByLevel(happinessLevel).label : "แตะเพื่อเลือกระดับ"}
            </span>
          </div>

          <label>
            ระดับความอยาก (1-10)
            <div className="backfill-modal-range">
              <input
                type="range"
                min={1}
                max={10}
                value={cravingLevel}
                onChange={(e) => setCravingLevel(e.target.value)}
              />
              <span className="backfill-modal-range-value">{cravingLevel}</span>
            </div>
          </label>

          <label>
            สถานการณ์ (ถ้ามี)
            <select value={context} onChange={(e) => setContext(e.target.value)}>
              {CONTEXT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            บันทึกเพิ่มเติม (ถ้ามี)
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </label>

          {error && <p className="backfill-modal-error">{error}</p>}

          <div className="backfill-modal-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || !happinessLevel}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BackfillEmotionModal;
