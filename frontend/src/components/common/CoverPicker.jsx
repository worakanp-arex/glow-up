import { Check } from "lucide-react";
import "./CoverPicker.css";

// Style for an option's preview / the hero it decorates. `image` options use a
// file, `gradient` options use a CSS background.
export function coverStyle(option) {
  if (!option) return undefined;
  return option.kind === "gradient"
    ? { background: option.value }
    : { backgroundImage: `url(${option.value})`, backgroundSize: "cover", backgroundPosition: "center" };
}

// A grid of selectable backgrounds with thumbnails, optionally grouped.
// options: [{ key, label, kind: "image" | "gradient", value, group? }]
export default function CoverPicker({ options, value, onChange, label = "เลือกพื้นหลัง" }) {
  const groups = [];
  for (const option of options) {
    const name = option.group || "";
    let group = groups.find((item) => item.name === name);
    if (!group) groups.push((group = { name, options: [] }));
    group.options.push(option);
  }

  return (
    <div className="cover-picker" role="group" aria-label={label}>
      {groups.map((group) => (
        <div key={group.name || "all"} className="cover-picker-group">
          {group.name && <p className="cover-picker-heading">{group.name}</p>}
          <div className="cover-picker-grid">
            {group.options.map((option) => {
              const selected = option.key === value;
              return (
                <button
                  key={option.key}
                  type="button"
                  className={`cover-picker-option${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => onChange(option.key)}
                >
                  <span className="cover-picker-thumb" style={coverStyle(option)}>
                    {selected && <span className="cover-picker-check" aria-hidden="true"><Check size={14} /></span>}
                  </span>
                  <span className="cover-picker-label">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
