import { HAPPINESS_LEVELS } from "../../constants/happiness.js";
import "./MoodFacePicker.css";

// The 7-step happiness scale as round faces with their labels underneath.
export default function MoodFacePicker({ value, onChange, label = "ระดับความสุขวันนี้" }) {
  return (
    <div className="mood-faces" role="radiogroup" aria-label={label}>
      {HAPPINESS_LEVELS.map(({ level, label: text, icon: Icon, color }) => (
        <button
          key={level}
          type="button"
          role="radio"
          aria-checked={value === level}
          className={`mood-face${value === level ? " is-active" : ""}`}
          style={{ "--happiness-color": color }}
          onClick={() => onChange(level)}
        >
          <span className="mood-face-icon"><Icon size={22} aria-hidden="true" /></span>
          <span className="mood-face-label">{text}</span>
        </button>
      ))}
    </div>
  );
}
