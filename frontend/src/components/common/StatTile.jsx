import "./StatTile.css";

function StatTile({ label, value, tone = "neutral" }) {
  return (
    <div className={`stat-tile stat-tile-${tone}`}>
      <p className="stat-tile-label">{label}</p>
      <p className="stat-tile-value">{value}</p>
    </div>
  );
}

export default StatTile;
