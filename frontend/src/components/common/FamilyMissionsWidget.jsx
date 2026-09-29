import { useEffect, useState } from "react";
import { CheckCircle2, Heart } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as familyMissionService from "../../services/familyMissionService.js";
import "./FamilyMissionsWidget.css";

// Shown to both sides of an active family link (recovering user and family
// member) — the backend decides which of userConfirmed/familyConfirmed
// belongs to the caller based on their role, so this component works
// unchanged on either the user Dashboard or the family Dashboard.
function FamilyMissionsWidget() {
  const { user } = useAuth();
  const myConfirmedKey = user.role === "family" ? "familyConfirmed" : "userConfirmed";
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  function load() {
    familyMissionService
      .getMyTodayFamilyMissions()
      .then(setMissions)
      .catch(() => setMissions([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleConfirm(missionId) {
    setConfirmingId(missionId);
    try {
      await familyMissionService.confirmFamilyMission(missionId);
      load();
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
      <ul>
        {missions.map(({ mission, completed, ...confirmations }) => {
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
                  className="btn btn-secondary"
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
    </section>
  );
}

export default FamilyMissionsWidget;
