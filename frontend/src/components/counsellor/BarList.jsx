import "./BarList.css";

// Horizontal bars for a ranked list: label on the left, bar and value on the
// right. `items` is [{ key, label, value, hint? }]; bars scale to the largest.
export default function BarList({ items, unit = "ครั้ง", emptyText = "ยังไม่มีข้อมูลในช่วงนี้" }) {
  if (!items || items.length === 0) return <p className="bar-list-empty">{emptyText}</p>;
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ol className="bar-list">
      {items.map((item, index) => (
        <li key={item.key}>
          <span className="bar-list-rank">{index + 1}</span>
          <div className="bar-list-body">
            <div className="bar-list-head">
              <span className="bar-list-label">{item.label}</span>
              <span className="bar-list-value">{item.value.toLocaleString("th-TH")} {unit}</span>
            </div>
            <div className="bar-list-track" role="presentation"><span style={{ width: `${(item.value / max) * 100}%` }} /></div>
            {item.hint && <small>{item.hint}</small>}
          </div>
        </li>
      ))}
    </ol>
  );
}
