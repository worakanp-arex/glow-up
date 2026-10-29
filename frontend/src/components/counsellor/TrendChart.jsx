import { useMemo, useState } from "react";
import { Table2, X } from "lucide-react";
import { lastDays, niceAxis } from "../../utils/chartDays.js";
import "./TrendChart.css";

const WIDTH = 640;
const HEIGHT = 300;
const MARGIN = { top: 16, right: 20, bottom: 56, left: 52 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

const DAY = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
const FULL_DAY = new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function asDate(dateKey) {
  return new Date(`${dateKey}T00:00:00Z`);
}

// กราฟเส้นการเข้าสู่ระบบรายวันพร้อมป้ายแกน: X = วันที่ Y = จำนวน
// คน `trend` คือ loginTrend ของภาพรวม ([{ dateKey, count }]) วันที่
// ไม่มีข้อมูลวาดเป็นศูนย์ มีมุมมองตารางสำหรับโปรแกรมอ่านหน้าจอ
export default function TrendChart({ trend, days = 14, yLabel = "จำนวนผู้เข้าใช้ (คน)", xLabel = "วันที่" }) {
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState(null);

  const series = useMemo(() => {
    const byKey = new Map((trend || []).map((item) => [item.dateKey, item.count]));
    return lastDays(days).map((dateKey) => ({ dateKey, count: byKey.get(dateKey) || 0 }));
  }, [trend, days]);

  const axis = niceAxis(Math.max(...series.map((point) => point.count)));
  const x = (index) => MARGIN.left + (series.length === 1 ? PLOT_W / 2 : (index / (series.length - 1)) * PLOT_W);
  const y = (value) => MARGIN.top + PLOT_H - (value / axis.max) * PLOT_H;
  const ticks = Array.from({ length: axis.max / axis.step + 1 }, (_, i) => i * axis.step);
  const line = series.map((point, i) => `${x(i)},${y(point.count)}`).join(" ");
  const area = `${MARGIN.left},${y(0)} ${line} ${x(series.length - 1)},${y(0)}`;
  const labelEvery = series.length > 10 ? 2 : 1;

  return (
    <div className="trend-chart">
      <div className="trend-chart-toolbar">
        <button type="button" onClick={() => setShowTable((value) => !value)}>
          {showTable ? <X size={14} aria-hidden="true" /> : <Table2 size={14} aria-hidden="true" />}
          <span>{showTable ? "ปิดตาราง" : "ดูแบบตาราง"}</span>
        </button>
      </div>

      {showTable ? (
        <table className="trend-chart-table">
          <thead><tr><th>{xLabel}</th><th>{yLabel}</th></tr></thead>
          <tbody>
            {series.map((point) => <tr key={point.dateKey}><td>{FULL_DAY.format(asDate(point.dateKey))}</td><td>{point.count}</td></tr>)}
          </tbody>
        </table>
      ) : (
        <div className="trend-chart-plot">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`กราฟเส้นแสดง${yLabel}ใน ${series.length} วันล่าสุด`}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="trend-grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} />
              <text className="trend-tick" x={MARGIN.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">{tick}</text>
            </g>
          ))}
          <line className="trend-axis" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(0)} y2={y(0)} />
          <line className="trend-axis" x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={y(0)} />

          <polygon className="trend-area" points={area} />
          <polyline className="trend-line" points={line} />

          {series.map((point, i) => (
            <g key={point.dateKey}>
              <circle
                className={`trend-dot${hover === i ? " is-hover" : ""}`}
                cx={x(i)}
                cy={y(point.count)}
                r={hover === i ? 6 : 4}
                tabIndex={0}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <title>{FULL_DAY.format(asDate(point.dateKey))}: {point.count} คน</title>
              </circle>
              {i % labelEvery === 0 && (
                <text className="trend-tick" x={x(i)} y={y(0) + 18} textAnchor="middle">{DAY.format(asDate(point.dateKey))}</text>
              )}
            </g>
          ))}

          {hover !== null && (
            <g className="trend-hover">
              <text x={x(hover)} y={y(series[hover].count) - 12} textAnchor="middle">{series[hover].count} คน</text>
            </g>
          )}

          <text className="trend-axis-title" x={MARGIN.left + PLOT_W / 2} y={HEIGHT - 8} textAnchor="middle">{xLabel}</text>
          <text className="trend-axis-title" transform={`translate(14 ${MARGIN.top + PLOT_H / 2}) rotate(-90)`} textAnchor="middle">{yLabel}</text>
        </svg>
        </div>
      )}
    </div>
  );
}
