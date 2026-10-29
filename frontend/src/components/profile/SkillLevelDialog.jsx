import { useState } from "react";
import { Check } from "lucide-react";
import EditorDialog from "../common/EditorDialog.jsx";
import { SKILL_LEVELS } from "../../constants/skillLevels.js";
import "./SkillLevelDialog.css";

// ป๊อปอัปเลือกระดับความชำนาญของทักษะ แสดงเมื่อเลือกทักษะ
// ครั้งแรก และเมื่อกดป้ายระดับของทักษะที่มีอยู่เพื่อเปลี่ยน
export default function SkillLevelDialog({ skillName, initialLevel = 3, onConfirm, onClose }) {
  const [level, setLevel] = useState(initialLevel);

  return (
    <EditorDialog title={skillName} saveLabel="บันทึก" onSave={() => onConfirm(level)} onClose={onClose}>
      <p className="ui-muted">คุณชำนาญทักษะนี้แค่ไหน</p>
      <div className="skill-level-options">
        {SKILL_LEVELS.map((item) => (
          <label key={item.value} className="ui-choice skill-level-option">
            <input type="radio" name="skill-level" checked={level === item.value} onChange={() => setLevel(item.value)} />
            <span className="ui-choice-mark" aria-hidden="true"><Check size={13} /></span>
            <span className="ui-choice-text">
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </label>
        ))}
      </div>
    </EditorDialog>
  );
}
