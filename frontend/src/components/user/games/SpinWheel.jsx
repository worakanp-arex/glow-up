import { useEffect, useRef, useState } from "react";
import { Gift } from "lucide-react";
import * as gameService from "../../../services/gameService.js";
import { GameResult } from "./GameShell.jsx";
import "./SpinWheel.css";

const SPIN_MS = 3600;
const COLORS = ["#3289d1", "#8b7fd6", "#5cb8a8", "#7ab2e1", "#215f92", "#b3a9ea"];
const SIZE = 300;
const R = SIZE / 2;

function point(angleDeg, radius) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [R + radius * Math.cos(rad), R + radius * Math.sin(rad)];
}

function slicePath(start, end) {
  const [x1, y1] = point(start, R);
  const [x2, y2] = point(end, R);
  const large = end - start > 180 ? 1 : 0;
  return `M${R},${R} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z`;
}

// Segment labels come from the server so the landing spot always matches
// the segment it picked.
function SpinWheel({ segments, onPlayed, onClose }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const count = segments.length;
  const angle = 360 / Math.max(count, 1);

  // An older API without wheelSegments would otherwise draw an empty wheel.
  if (count === 0) return <p className="game-error">โหลดวงล้อไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง</p>;

  async function handleSpin() {
    setError("");
    setResult(null);
    setSpinning(true);
    try {
      const data = await gameService.spinWheel();
      const center = data.segmentIndex * angle + angle / 2;
      setRotation((prev) => prev - (prev % 360) + 5 * 360 + (360 - center));
      timer.current = setTimeout(() => {
        setSpinning(false);
        setResult(data);
        onPlayed?.();
      }, SPIN_MS);
    } catch (err) {
      setError(err.response?.data?.message || "หมุนวงล้อไม่สำเร็จ");
      setSpinning(false);
    }
  }

  return (
    <div className="wheel-game">
      <div className="wheel-stage">
        <span className="wheel-pointer" aria-hidden="true" />
        <svg
          className="wheel-disc"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ transform: `rotate(${rotation}deg)`, transitionDuration: `${SPIN_MS}ms` }}
          role="img"
          aria-label={`วงล้อ ${count} ช่อง: ${segments.join(", ")}`}
        >
          {segments.map((label, i) => {
            const start = i * angle;
            const [tx, ty] = point(start + angle / 2, R * 0.62);
            return (
              <g key={`${label}-${i}`}>
                <path d={slicePath(start, start + angle)} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="2" />
                <text x={tx} y={ty} transform={`rotate(${start + angle / 2 - 90} ${tx} ${ty})`} textAnchor="middle" dominantBaseline="middle" className="wheel-label">
                  {label}
                </text>
              </g>
            );
          })}
          <circle cx={R} cy={R} r="22" fill="#fff" />
          <circle cx={R} cy={R} r="12" fill="#f2a071" />
        </svg>
      </div>

      {result ? (
        <GameResult
          headline={`ได้ "${result.segment.label}"`}
          detail="ก้าวเล็ก ๆ วันนี้ก็มีความหมาย"
          pointsAwarded={result.pointsAwarded}
          practice={result.practice}
          onReplay={handleSpin}
          onClose={onClose}
        />
      ) : (
        <div className="wheel-actions">
          <button type="button" className="ui-btn ui-btn-primary wheel-spin-btn" onClick={handleSpin} disabled={spinning}>
            <Gift size={16} aria-hidden="true" />
            {spinning ? "กำลังหมุน..." : "หมุนวงล้อ"}
          </button>
          {error && <p className="game-error">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default SpinWheel;
