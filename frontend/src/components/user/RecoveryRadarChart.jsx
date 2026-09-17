import { useState } from "react";
import { Table2, X } from "lucide-react";
import "./RecoveryRadarChart.css";

const SIZE = 300;
const CENTER = SIZE / 2;
const MAX_RADIUS = 105;
const GRID_STEPS = [0.25, 0.5, 0.75, 1];
const LABEL_OFFSET = 26;

function pointAt(index, count, fraction) {
  const angle = -90 + (360 / count) * index;
  const rad = (angle * Math.PI) / 180;
  const r = MAX_RADIUS * fraction;
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

function polygonPoints(count, fraction) {
  return Array.from({ length: count }, (_, i) => {
    const { x, y } = pointAt(i, count, fraction);
    return `${x},${y}`;
  }).join(" ");
}

function RecoveryRadarChart({ data }) {
  const [showTable, setShowTable] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);
  const count = data.length;

  const dataPoints = data.map((item, i) => pointAt(i, count, item.score / 100));
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="recovery-radar">
      <div className="recovery-radar-header">
        <h2>พัฒนาการของคุณ</h2>
        <button type="button" className="recovery-radar-table-toggle" onClick={() => setShowTable((v) => !v)}>
          {showTable ? <X size={14} /> : <Table2 size={14} />}
          <span>{showTable ? "ปิดตาราง" : "ดูแบบตาราง"}</span>
        </button>
      </div>
      <p className="recovery-radar-caption">
        สรุปจากกิจกรรม เช็คอิน และเกมใน 30 วันล่าสุด ยิ่งแกนไหนยื่นออกมาไกล แปลว่าด้านนั้นทำได้สม่ำเสมอมากขึ้น
      </p>

      {showTable ? (
        <table className="recovery-radar-data-table">
          <thead>
            <tr>
              <th>ด้าน</th>
              <th>ระดับ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.domain}>
                <td>{item.label}</td>
                <td>{item.score}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="recovery-radar-svg" role="img" aria-label="กราฟใยแมงมุมแสดงพัฒนาการ 6 ด้าน">
          {GRID_STEPS.map((fraction) => (
            <polygon key={fraction} points={polygonPoints(count, fraction)} className="recovery-radar-grid-ring" />
          ))}
          {data.map((_, i) => {
            const { x, y } = pointAt(i, count, 1);
            return <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} className="recovery-radar-spoke" />;
          })}

          <polygon points={dataPolygon} className="recovery-radar-data-fill" />
          <polygon points={dataPolygon} className="recovery-radar-data-stroke" />

          {dataPoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoverIndex === i ? 6 : 4.5}
              className="recovery-radar-vertex"
              tabIndex={0}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onFocus={() => setHoverIndex(i)}
              onBlur={() => setHoverIndex(null)}
            >
              <title>
                {data[i].label}: {data[i].score}%
              </title>
            </circle>
          ))}

          {data.map((item, i) => {
            const { x, y } = pointAt(i, count, 1 + LABEL_OFFSET / MAX_RADIUS);
            return (
              <text key={item.domain} x={x} y={y} className="recovery-radar-label" textAnchor="middle" dominantBaseline="middle">
                {item.label}
              </text>
            );
          })}

          {hoverIndex !== null && (
            <text
              x={CENTER}
              y={CENTER}
              className="recovery-radar-hover-value"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {data[hoverIndex].label} {data[hoverIndex].score}%
            </text>
          )}
        </svg>
      )}
    </div>
  );
}

export default RecoveryRadarChart;
