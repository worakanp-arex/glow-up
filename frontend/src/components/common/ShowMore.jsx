import { ChevronDown, ChevronUp } from "lucide-react";
import "./ShowMore.css";

// The "show more / show less" button under a list limited with useShowMore.
export default function ShowMoreButton({ hidden, expanded, onToggle }) {
  if (hidden <= 0) return null;
  return (
    <button type="button" className="show-more" onClick={onToggle} aria-expanded={expanded}>
      {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      <span>{expanded ? "แสดงน้อยลง" : `แสดงเพิ่มเติม (อีก ${hidden} รายการ)`}</span>
    </button>
  );
}
