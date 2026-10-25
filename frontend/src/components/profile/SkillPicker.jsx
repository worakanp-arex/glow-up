import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { SKILL_CATEGORIES, skillCategoryLabel } from "../../constants/skillCategories.js";
import "./SkillPicker.css";

// Searchable list of career skills grouped by category. Each skill is a
// selectable card with the tick inside it; `onToggle(skill)` is called when it
// is picked or unpicked, `selectedIds` says which are currently chosen.
export default function SkillPicker({ skills, selectedIds, onToggle, loading = false, emptyText = "ยังไม่มีทักษะในระบบ" }) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = skills.filter((skill) => !needle || skill.skillName.toLowerCase().includes(needle));
    const order = SKILL_CATEGORIES.map((category) => category.key);
    const byCategory = new Map();
    for (const skill of matching) {
      const key = skill.category && order.includes(skill.category) ? skill.category : "other";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key).push(skill);
    }
    return [...order, "other"]
      .filter((key) => byCategory.has(key))
      .map((key) => ({
        key,
        label: key === "other" ? "อื่น ๆ" : skillCategoryLabel(key),
        skills: byCategory.get(key).sort((a, b) => a.skillName.localeCompare(b.skillName, "th")),
      }));
  }, [skills, query]);

  return (
    <div className="skill-picker">
      <label className="skill-picker-search">
        <Search size={16} aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาทักษะ เช่น ครัว ขับรถ คอมพิวเตอร์" aria-label="ค้นหาทักษะ" />
      </label>

      {loading ? (
        <p className="ui-muted">กำลังโหลดรายการทักษะ...</p>
      ) : groups.length === 0 ? (
        <p className="ui-muted">{query ? `ไม่พบทักษะที่ตรงกับ "${query}"` : emptyText}</p>
      ) : (
        groups.map((group) => (
          <details key={group.key} className="skill-picker-group" open>
            <summary>
              <span>{group.label}</span>
              <small>{group.skills.filter((skill) => selected.has(skill._id)).length}/{group.skills.length}</small>
            </summary>
            <div className="skill-picker-list">
              {group.skills.map((skill) => (
                <label key={skill._id} className="ui-choice">
                  <input type="checkbox" checked={selected.has(skill._id)} onChange={() => onToggle(skill)} />
                  <span className="ui-choice-mark" aria-hidden="true"><Check size={13} /></span>
                  <span className="ui-choice-text">{skill.skillName}</span>
                </label>
              ))}
            </div>
          </details>
        ))
      )}
    </div>
  );
}
