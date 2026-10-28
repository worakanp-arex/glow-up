import { useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { SKILL_CATEGORIES, skillCategoryLabel } from "../../constants/skillCategories.js";
import "./SkillPicker.css";

// Career skills grouped by category. With no search text, the user first
// picks a category, then sees only that category's skills to choose from —
// picking straight from one long list of every skill was slow and overwhelming.
// Typing a search switches to a flat, matching list across every category.
export default function SkillPicker({ skills, selectedIds, onToggle, loading = false, emptyText = "ยังไม่มีทักษะในระบบ" }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const isSearching = query.trim().length > 0;

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

  // Land on a valid category once the list loads, and drop back to the
  // category list if a search clears out the one currently open.
  useEffect(() => {
    if (activeCategory && groups.some((group) => group.key === activeCategory)) return;
    setActiveCategory(isSearching ? null : groups[0]?.key ?? null);
  }, [groups, isSearching]); // eslint-disable-line react-hooks/exhaustive-deps

  const openGroup = groups.find((group) => group.key === activeCategory);

  function renderSkillList(list) {
    return (
      <div className="skill-picker-list">
        {list.map((skill) => (
          <label key={skill._id} className="ui-choice">
            <input type="checkbox" checked={selected.has(skill._id)} onChange={() => onToggle(skill)} />
            <span className="ui-choice-mark" aria-hidden="true"><Check size={13} /></span>
            <span className="ui-choice-text">{skill.skillName}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="skill-picker">
      <label className="ui-search">
        <Search size={16} aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาทักษะ เช่น ครัว ขับรถ คอมพิวเตอร์" aria-label="ค้นหาทักษะ" />
      </label>

      {loading ? (
        <p className="ui-muted">กำลังโหลดรายการทักษะ...</p>
      ) : groups.length === 0 ? (
        <p className="ui-muted">{query ? `ไม่พบทักษะที่ตรงกับ "${query}"` : emptyText}</p>
      ) : isSearching ? (
        groups.map((group) => (
          <div key={group.key} className="skill-picker-group">
            <p className="skill-picker-group-heading">
              <span>{group.label}</span>
              <small>{group.skills.filter((skill) => selected.has(skill._id)).length}/{group.skills.length}</small>
            </p>
            {renderSkillList(group.skills)}
          </div>
        ))
      ) : (
        <>
          <p className="skill-picker-step">1. เลือกความชำนาญ</p>
          <div className="skill-picker-categories">
            {groups.map((group) => {
              const count = group.skills.filter((skill) => selected.has(skill._id)).length;
              return (
                <button
                  key={group.key}
                  type="button"
                  className={`skill-picker-category${group.key === activeCategory ? " is-active" : ""}`}
                  onClick={() => setActiveCategory(group.key)}
                  aria-pressed={group.key === activeCategory}
                >
                  {group.label}
                  {count > 0 && <span className="skill-picker-category-count">{count}</span>}
                </button>
              );
            })}
          </div>

          {openGroup && (
            <div className="skill-picker-group">
              <p className="skill-picker-step">2. เลือกทักษะใน{openGroup.label}</p>
              {renderSkillList(openGroup.skills)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
