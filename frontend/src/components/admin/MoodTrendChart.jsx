import { useMemo, useState } from "react";
import { Table2, X } from "lucide-react";
import { lastDays } from "../../utils/chartDays.js";
import { HAPPINESS_LEVELS, happinessByLevel } from "../../constants/happiness.js";
import "../counsellor/TrendChart.css";

const WIDTH = 640;
const HEIGHT = 300;
const MARGIN = { top: 16, right: 20, bottom: 56, left: 52 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;
const MIN_LEVEL = 1;
const MAX_LEVEL = 7;

const DAY = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
const FULL_DAY = new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const asDate = (dateKey) => new Date(`${dateKey}T00:00:00Z`);

// กราฟเส้นค่าเฉลี่ยความสุข (1–7) ของผู้ใช้ทุกคนรวมกันรายวัน `trend` คือ
// [{ dateKey, average, count }] วันที่ไม่มีข้อมูลเว้นช่องว่างในเส้น ไม่ลากผ่านเป็นศูนย์
export default function MoodTrendChart({ trend, days = 30 }) {
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState(null);

  const series = useMemo(() => {
    const byKey = new Map((trend || []).map((item) => [item.dateKey, item]));
    return lastDays(days).map((dateKey) => ({ dateKey, ...(byKey.get(dateKey) || {}) }));
  }, [trend, days]);

  const x = (index) => MARGIN.left + (series.length === 1 ? PLOT_W / 2 : (index / (series.length - 1)) * PLOT_W);
  const y = (value) => MARGIN.top + PLOT_H - ((value - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL)) * PLOT_H;
  const ticks = HAPPINESS_LEVELS.map((item) => item.level);
  const labelEvery = series.length > 14 ? 3 : series.length > 10 ? 2 : 1;

  const segments = [];
  let current = [];
  series.forEach((point, index) => {
    if (point.average === undefined) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push(`${x(index)},${y(point.average)}`);
    }
  });
  if (current.length) segments.push(current);

  const withData = series.filter((point) => point.average !== undefined);
  const totalEntries = withData.reduce((sum, point) => sum + point.count, 0);
  const overall = totalEntries ? withData.reduce((sum, point) => sum + point.average * point.count, 0) / totalEntries : null;
  const overallLabel = overall === null ? null : happinessByLevel(Math.round(overall))?.label;

  return (
    <div className="trend-chart">
      <div className="trend-chart-toolbar">
        {overall !== null && (
          <p className="mood-trend-summary">ค่าเฉลี่ยช่วงนี้ <strong>{overall.toFixed(1)}</strong> จาก 7{overallLabel && ` (${overallLabel})`}</p>
        )}
        <button type="button" onClick={() => setShowTable((value) => !value)}>
          {showTable ? <X size={14} aria-hidden="true" /> : <Table2 size={14} aria-hidden="true" />}
          <span>{showTable ? "ปิดตาราง" : "ดูแบบตาราง"}</span>
        </button>
      </div>

      {showTable ? (
        <table className="trend-chart-table">
          <thead><tr><th>วันที่</th><th>จำนวนที่บันทึก</th><th>ความสุขเฉลี่ย</th></tr></thead>
          <tbody>
            {withData.map((point) => (
              <tr key={point.dateKey}><td>{FULL_DAY.format(asDate(point.dateKey))}</td><td>{point.count} คน</td><td>{point.average.toFixed(1)}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="trend-chart-plot">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`กราฟเส้นแสดงความสุขเฉลี่ยของผู้ใช้ใน ${series.length} วันล่าสุด`}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line className="trend-grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} />
                <text className="trend-tick" x={MARGIN.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">{tick}</text>
              </g>
            ))}
            <line className="trend-axis" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(MIN_LEVEL)} y2={y(MIN_LEVEL)} />
            <line className="trend-axis" x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={y(MIN_LEVEL)} />

            {segments.map((points, i) => <polyline key={i} className="trend-line" points={points.join(" ")} />)}

            {series.map((point, i) => (
              <g key={point.dateKey}>
                {point.average !== undefined && (
                  <circle
                    className={`trend-dot${hover === i ? " is-hover" : ""}`}
                    cx={x(i)}
                    cy={y(point.average)}
                    r={hover === i ? 6 : 4}
                    tabIndex={0}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                  >
                    <title>{FULL_DAY.format(asDate(point.dateKey))}: เฉลี่ย {point.average.toFixed(1)} (จาก {point.count} คน)</title>
                  </circle>
                )}
                {i % labelEvery === 0 && (
                  <text className="trend-tick" x={x(i)} y={y(MIN_LEVEL) + 18} textAnchor="middle">{DAY.format(asDate(point.dateKey))}</text>
                )}
              </g>
            ))}

            {hover !== null && series[hover].average !== undefined && (
              <g className="trend-hover">
                <text x={x(hover)} y={y(series[hover].average) - 12} textAnchor="middle">{series[hover].average.toFixed(1)}</text>
              </g>
            )}

            <text className="trend-axis-title" x={MARGIN.left + PLOT_W / 2} y={HEIGHT - 8} textAnchor="middle">วันที่</text>
            <text className="trend-axis-title" transform={`translate(14 ${MARGIN.top + PLOT_H / 2}) rotate(-90)`} textAnchor="middle">ความสุขเฉลี่ย (1–7)</text>
          </svg>
        </div>
      )}
    </div>
  );
}
