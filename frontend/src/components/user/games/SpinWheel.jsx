import { useState } from "react";
import { Gift } from "lucide-react";
import * as gameService from "../../../services/gameService.js";
import "./SpinWheel.css";

const SEGMENT_COUNT = 8;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

function segmentBackground() {
  const stops = [];
  for (let i = 0; i < SEGMENT_COUNT; i += 1) {
    const color = i % 2 === 0 ? "var(--color-primary-400)" : "var(--color-primary-600)";
    stops.push(`${color} ${i * SEGMENT_ANGLE}deg ${(i + 1) * SEGMENT_ANGLE}deg`);
  }
  return `conic-gradient(${stops.join(", ")})`;
}

function SpinWheel({ status, onPlayed, embedded = false }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState("");
  const [resultLabel, setResultLabel] = useState(status.resultLabel || null);

  async function handleSpin() {
    setError("");
    setSpinning(true);
    try {
      const { segmentIndex, segment } = await gameService.spinWheel();
      const segmentCenter = segmentIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
      const extraSpins = 5 * 360;
      const target = extraSpins + (360 - segmentCenter);
      setRotation(target);
      setTimeout(() => {
        setResultLabel(segment.label);
        setSpinning(false);
        onPlayed?.();
      }, 3200);
    } catch (err) {
      setError(err.response?.data?.message || "หมุนวงล้อไม่สำเร็จ");
      setSpinning(false);
    }
  }

  const played = status.played || Boolean(resultLabel);

  return (
    <div className={`spin-wheel-card${embedded ? " embedded" : ""}`}>
      <div className="spin-wheel-stage">
        <div className="spin-wheel-pointer" />
        <div
          className="spin-wheel-disc"
          style={{ background: segmentBackground(), transform: `rotate(${rotation}deg)` }}
        />
      </div>

      {played ? (
        <p className="spin-wheel-result">
          <Gift size={15} />
          <span>{resultLabel ? `ได้รับ ${resultLabel}` : "เล่นแล้ววันนี้"}</span>
        </p>
      ) : (
        <button type="button" className="btn btn-primary" onClick={handleSpin} disabled={spinning}>
          {spinning ? "กำลังหมุน..." : "หมุนวงล้อ"}
        </button>
      )}
      {error && <p className="spin-wheel-error">{error}</p>}
    </div>
  );
}

export default SpinWheel;
