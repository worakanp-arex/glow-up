import { useEffect, useState } from "react";
import {
  Award,
  CalendarCheck,
  CheckCircle2,
  Flame,
  Gift,
  Sprout,
  Target,
  Trophy,
} from "lucide-react";
import * as missionService from "../../services/missionService.js";
import * as rewardService from "../../services/rewardService.js";
import "./MissionBoard.css";

const ICONS = { Flame, CalendarCheck, Award, Sprout, Trophy, Gift };

function MissionIcon({ name, ...props }) {
  const Icon = ICONS[name] || Target;
  return <Icon {...props} />;
}

function MissionBoard() {
  const [missions, setMissions] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([missionService.getMyMissionProgress(), rewardService.getMyRewards()])
      .then(([missionData, rewardData]) => {
        setMissions(missionData);
        setRewards(rewardData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="mission-board-loading">กำลังโหลดภารกิจ...</p>;
  }

  if (missions.length === 0) {
    return null;
  }

  return (
    <div className="mission-board">
      <h2>
        <Target size={18} />
        <span>ภารกิจและรางวัล</span>
      </h2>

      <ul className="mission-board-list">
        {missions.map(({ mission, progress, completed }) => (
          <li key={mission._id} className={completed ? "completed" : ""}>
            <span className="mission-board-icon">
              {completed ? <CheckCircle2 size={18} /> : <MissionIcon name={mission.badgeIcon} size={18} />}
            </span>
            <span className="mission-board-info">
              <span className="mission-board-title">{mission.title}</span>
              <span className="mission-board-progress-bar">
                <span
                  className="mission-board-progress-fill"
                  style={{ width: `${Math.min(100, (progress / mission.targetValue) * 100)}%` }}
                />
              </span>
              <span className="mission-board-progress-label">
                {progress}/{mission.targetValue}
                {mission.rewardPoints > 0 && ` · +${mission.rewardPoints} แต้ม`}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {rewards.length > 0 && (
        <div className="mission-board-rewards">
          <h3>รางวัลที่ได้รับ</h3>
          <ul className="mission-board-rewards-list">
            {rewards.map(({ _id, reward, earnedAt }) => (
              <li key={_id} title={new Date(earnedAt).toLocaleDateString("th-TH")}>
                <MissionIcon name={reward.icon} size={16} />
                <span>{reward.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default MissionBoard;
