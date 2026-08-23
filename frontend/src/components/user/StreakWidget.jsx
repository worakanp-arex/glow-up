import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import PlantGrowth, { stageLabel, streakToStage } from "./PlantGrowth.jsx";
import "./StreakWidget.css";

function StreakWidget({ streak }) {
  const currentStreak = streak?.currentStreak ?? 0;
  const stage = streakToStage(currentStreak);

  return (
    <Link to="/streak" className="streak-widget">
      <PlantGrowth streak={currentStreak} size={88} />
      <div className="streak-widget-body">
        <span className="streak-widget-count">
          <Flame size={16} />
          {currentStreak} วันติดต่อกัน
        </span>
        <p className="streak-widget-stage">{stageLabel(stage)}</p>
        <span className="streak-widget-link">ดูสถิติต้นไม้ของฉัน</span>
      </div>
    </Link>
  );
}

export default StreakWidget;
