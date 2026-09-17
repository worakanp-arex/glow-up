import { useCallback, useEffect, useState } from "react";
import { Brain, Gamepad2, HelpCircle, ListTodo, PartyPopper, Sparkles } from "lucide-react";
import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import * as gameService from "../../services/gameService.js";
import ActivityMissionBoard from "../../components/user/ActivityMissionBoard.jsx";
import SpinWheel from "../../components/user/games/SpinWheel.jsx";
import CopingMemoryGame from "../../components/user/games/CopingMemoryGame.jsx";
import DailyQuiz from "../../components/user/games/DailyQuiz.jsx";
import QuestRow from "../../components/user/games/QuestRow.jsx";
import RecoveryRadarChart from "../../components/user/RecoveryRadarChart.jsx";
import "./RecoveryGame.css";

const QUEST_DEFS = [
  {
    key: "activity",
    title: "ภารกิจประจำวัน",
    icon: ListTodo,
    subtitle: "เลือกทำภารกิจอย่างน้อย 1 อย่าง (หรือเช็คอินอารมณ์ที่หน้าหลัก) เพื่อปลดล็อกเควสถัดไป",
  },
  { key: "wheel", title: "วงล้อสุ่มรางวัล", icon: Sparkles, subtitle: "หมุนวงล้อรับแต้มโบนัสแบบสุ่ม" },
  { key: "memory", title: "จับคู่การ์ดทักษะรับมือ", icon: Brain, subtitle: "จับคู่สิ่งกระตุ้นกับวิธีรับมือให้ครบทุกคู่" },
  { key: "quiz", title: "แบบทดสอบประจำวัน", icon: HelpCircle, subtitle: "ตอบคำถามความรู้ฟื้นฟู 3 ข้อ" },
];

function buildQuests(status) {
  return QUEST_DEFS.map((def) => {
    if (def.key === "activity") {
      return { ...def, done: status.unlocked, locked: false, doneSummary: "ทำภารกิจวันนี้แล้ว" };
    }
    const game = status.games[def.key];
    return {
      ...def,
      done: game.played,
      locked: !status.unlocked,
      doneSummary: game.resultLabel ? `ได้ ${game.resultLabel}` : "เล่นแล้ววันนี้",
    };
  });
}

function firstIncompleteKey(quests) {
  return quests.find((q) => !q.done && !q.locked)?.key ?? null;
}

function RecoveryGame() {
  const [status, setStatus] = useState(null);
  const [radar, setRadar] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadAll = useCallback(() => {
    return Promise.all([gameService.getGameHubStatus(), gameService.getMyRadar()]).then(([statusData, radarData]) => {
      setStatus(statusData);
      setRadar(radarData);
      const quests = buildQuests(statusData);
      setExpandedKey((prev) => {
        const prevQuest = quests.find((q) => q.key === prev);
        if (prev === null || !prevQuest || prevQuest.done) return firstIncompleteKey(quests);
        return prev;
      });
    });
  }, []);

  useEffect(() => {
    loadAll()
      .catch((err) => setLoadError(err))
      .finally(() => setLoading(false));
  }, [loadAll]);

  const refresh = useCallback(() => {
    loadAll().catch(() => {});
  }, [loadAll]);

  function handleToggle(key) {
    setExpandedKey((prev) => (prev === key ? null : key));
  }

  const pageHeader = (
    <PageHeader
      icon={Gamepad2}
      backTo="/streak"
      backLabel="ความก้าวหน้าและรางวัล"
      description="ทำเควสวันนี้ตามลำดับ ภารกิจ → เกม รับแต้มสะสม และดูพัฒนาการของคุณในแต่ละด้าน"
    >
      เควสฟื้นฟูวันนี้
    </PageHeader>
  );

  if (loadError) {
    return (
      <div className="recovery-game-page">
        {pageHeader}
        <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="recovery-game-page">
        {pageHeader}
        <AsyncState />
      </div>
    );
  }

  const quests = buildQuests(status);
  const doneCount = quests.filter((q) => q.done).length;
  const allDone = doneCount === quests.length;

  return (
    <div className="recovery-game-page">
      {pageHeader}

      <div className="quest-progress">
        <span className="quest-progress-label">
          วันนี้ทำไปแล้ว {doneCount}/{quests.length} เควส
        </span>
        <div className="quest-progress-bar">
          <div className="quest-progress-fill" style={{ width: `${(doneCount / quests.length) * 100}%` }} />
        </div>
      </div>

      {allDone && (
        <div className="quest-all-done">
          <PartyPopper size={18} />
          <span>ทำครบทุกเควสวันนี้แล้ว เก่งมาก! กลับมาทำเควสใหม่ได้พรุ่งนี้</span>
        </div>
      )}

      <ul className="quest-list">
        {quests.map((quest) => {
          const status_ = quest.locked ? "locked" : quest.done ? "done" : "current";
          const expanded = expandedKey === quest.key;
          return (
            <QuestRow
              key={quest.key}
              icon={quest.icon}
              title={quest.title}
              subtitle={quest.subtitle}
              doneSummary={quest.doneSummary}
              status={status_}
              expanded={expanded}
              onToggle={() => handleToggle(quest.key)}
            >
              {quest.key === "activity" && <ActivityMissionBoard onLogged={refresh} embedded />}
              {quest.key === "wheel" && <SpinWheel status={status.games.wheel} onPlayed={refresh} embedded />}
              {quest.key === "memory" && <CopingMemoryGame status={status.games.memory} onPlayed={refresh} embedded />}
              {quest.key === "quiz" && <DailyQuiz status={status.games.quiz} onPlayed={refresh} embedded />}
            </QuestRow>
          );
        })}
      </ul>

      {radar && <RecoveryRadarChart data={radar} />}
    </div>
  );
}

export default RecoveryGame;
