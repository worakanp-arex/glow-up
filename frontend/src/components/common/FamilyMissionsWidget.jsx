import { useEffect, useState } from "react";
import { CheckCircle2, Heart } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as familyMissionService from "../../services/familyMissionService.js";
import ShowMoreButton from "./ShowMore.jsx";
import { useShowMore } from "./useShowMore.js";
import "./FamilyMissionsWidget.css";

// จำนวนภารกิจที่แสดงก่อนกด "แสดงเพิ่มเติม" (แคตตาล็อกมีได้หลายรายการ แต่การ์ดบนแดชบอร์ดต้องไม่ยาว)
const VISIBLE_MISSIONS = 3;

// แสดงให้ทั้งสองฝ่ายของลิงก์ครอบครัวที่ใช้งานอยู่ (ผู้ฟื้นฟูและสมาชิกครอบครัว) —
// backend ตัดสินว่า userConfirmed/familyConfirmed ตัวไหนเป็นของผู้เรียกตามบทบาท
// คอมโพเนนต์นี้จึงใช้ได้โดยไม่ต้องแก้ ทั้งบนแดชบอร์ดผู้ใช้หรือแดชบอร์ดครอบครัว
function FamilyMissionsWidget() {
  const { user } = useAuth();
  const myConfirmedKey = user.role === "family" ? "familyConfirmed" : "userConfirmed";
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmError, setConfirmError] = useState("");

  function load() {
    familyMissionService
      .getMyTodayFamilyMissions()
      .then(setMissions)
      .catch(() => setMissions([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  // ภารกิจที่ยังไม่เสร็จขึ้นก่อน ส่วนที่สำเร็จแล้วไปอยู่ท้ายรายการ (sort คงลำดับเดิมในแต่ละกลุ่ม)
  const ordered = [...missions].sort((a, b) => Number(a.completed) - Number(b.completed));
  const { shown, hidden, expanded, toggle } = useShowMore(ordered, VISIBLE_MISSIONS);

  async function handleConfirm(missionId) {
    setConfirmingId(missionId);
    setConfirmError("");
    try {
      await familyMissionService.confirmFamilyMission(missionId);
      load();
    } catch (err) {
      setConfirmError(err.response?.data?.message || "ยืนยันภารกิจไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setConfirmingId(null);
    }
  }

  if (loading || missions.length === 0) return null;

  return (
    <section className="family-missions-widget" aria-label="ภารกิจครอบครัวร่วมกัน">
      <h2>
        <Heart size={18} />
        <span>ภารกิจครอบครัวร่วมกันวันนี้</span>
      </h2>
      {confirmError && <p className="family-missions-widget-error" role="alert">{confirmError}</p>}
      <ul>
        {shown.map(({ mission, completed, ...confirmations }) => {
          const myConfirmed = confirmations[myConfirmedKey];
          return (
            <li key={mission._id} className={completed ? "done" : ""}>
              <div className="family-missions-widget-info">
                <p className="family-missions-widget-title">{mission.title}</p>
                {mission.description && <p className="family-missions-widget-desc">{mission.description}</p>}
                <p className="family-missions-widget-status">
                  {confirmations.userConfirmed ? "✓" : "○"} ผู้ใช้งาน · {confirmations.familyConfirmed ? "✓" : "○"} ครอบครัว
                </p>
              </div>
              {completed ? (
                <span className="family-missions-widget-done">
                  <CheckCircle2 size={16} />
                  <span>สำเร็จแล้ว</span>
                </span>
              ) : myConfirmed ? (
                <span className="family-missions-widget-waiting">รอการยืนยันอีกฝ่าย</span>
              ) : (
                <button
                  type="button"
                  className="ui-btn ui-btn-outline family-missions-widget-confirm"
                  onClick={() => handleConfirm(mission._id)}
                  disabled={confirmingId === mission._id}
                >
                  ยืนยันว่าทำแล้ว
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <ShowMoreButton hidden={hidden} expanded={expanded} onToggle={toggle} />
    </section>
  );
}

export default FamilyMissionsWidget;
