import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CheckCircle2, Clock, Gamepad2, Heart, Leaf, Play, Sparkles, Star } from "lucide-react";
import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import ImageSlot from "../../components/common/ImageSlot.jsx";
import * as gameService from "../../services/gameService.js";
import { getMyPointsSummary } from "../../services/missionService.js";
import { GameModal } from "../../components/user/games/GameShell.jsx";
import SpinWheel from "../../components/user/games/SpinWheel.jsx";
import CopingMemoryGame from "../../components/user/games/CopingMemoryGame.jsx";
import DailyQuiz from "../../components/user/games/DailyQuiz.jsx";
import RecoveryRadarChart from "../../components/user/RecoveryRadarChart.jsx";
import "./RecoveryGame.css";

// Points mirror the backend scoring in gameController (memory ≤10,
// quiz 3/answer, wheel 3–10). Only the first play per day earns XP.
const GAMES = [
  { key: "memory", title: "จับคู่ ดูแลใจ", description: "ฝึกความจำและการเชื่อมโยง จับคู่สิ่งกระตุ้นกับวิธีรับมือ", level: "สบาย ๆ", tone: "lilac", minutes: 3, xp: "+10 XP", icon: Heart, image: "/images/games/memory.png" },
  { key: "quiz", title: "เลือกทางของคุณ", description: "ฝึกตัดสินใจผ่านสถานการณ์ 3 ข้อ", level: "ลองคิดสักนิด", tone: "peach", minutes: 4, xp: "+9 XP", icon: BookOpen, image: "/images/games/quiz.png" },
  { key: "wheel", title: "วงล้อก้าวเล็ก ๆ", description: "สุ่มไอเดียกิจกรรมสำหรับวันนี้", level: "เริ่มง่าย", tone: "sky", minutes: 1, xp: "+3–10 XP", icon: Star, image: "/images/games/wheel.png" },
];

function RecoveryGame() {
  const [status, setStatus] = useState(null);
  const [radar, setRadar] = useState(null);
  const [points, setPoints] = useState(null);
  const [openKey, setOpenKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadAll = useCallback(() => {
    getMyPointsSummary().then(setPoints).catch(() => {});
    return Promise.all([gameService.getGameHubStatus(), gameService.getMyRadar()]).then(([statusData, radarData]) => {
      setStatus(statusData);
      setRadar(radarData);
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

  const closeGame = useCallback(() => setOpenKey(null), []);

  const pageHeader = (
    <PageHeader
      icon={Gamepad2}
      eyebrow="Play a little, grow a little"
      description="เลือกเกมที่อยากลอง เล่นเพื่อฝึกทักษะและให้เวลากับตัวเอง"
      actions={points && <span className="games-xp"><Sparkles size={15} aria-hidden="true" />{points.totalPoints ?? 0} XP</span>}
    >
      พักสักนิด มาเล่นกัน
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

  const playedCount = GAMES.filter((g) => status.games[g.key].played).length;
  const openGame = GAMES.find((g) => g.key === openKey);

  return (
    <div className="recovery-game-page">
      {pageHeader}

      <section className="ui-card games-intro">
        <span className="games-intro-icon" aria-hidden="true"><Gamepad2 size={20} /></span>
        <div>
          <strong>เวลาสั้น ๆ ก็เป็นก้าวที่ดีได้</strong>
          <span>ไม่มีการแข่งกับใคร เล่นในจังหวะของคุณ</span>
        </div>
        <p className="games-intro-count">เล่นแล้ว <b>{playedCount}</b> / {GAMES.length} เกมวันนี้</p>
      </section>

      <ul className="games-grid">
        {GAMES.map((game) => {
          const gameStatus = status.games[game.key];
          const played = gameStatus.played;
          return (
            <li key={game.key} className="ui-card game-card">
              <button type="button" className="game-card-media" onClick={() => setOpenKey(game.key)} aria-label={`เล่น ${game.title}`}>
                <ImageSlot src={game.image} alt="" tone={game.tone} />
                <span className="game-card-play" aria-hidden="true"><Play size={16} fill="currentColor" /></span>
              </button>
              <div className="game-card-body">
                <div className="game-card-meta">
                  <span className={`ui-chip ui-chip-${game.tone === "sky" ? "neutral" : game.tone}`}>{game.level}</span>
                  <span className="ui-muted"><Clock size={13} aria-hidden="true" />{game.minutes} นาที</span>
                </div>
                <h2>{game.title}</h2>
                <p>{game.description}</p>
                <div className="game-card-foot">
                  <span className={`game-card-xp${played ? " is-earned" : ""}`}>
                    {played ? <CheckCircle2 size={13} aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />}
                    {played ? `ได้ +${gameStatus.pointsAwarded ?? 0} XP แล้ววันนี้` : game.xp}
                  </span>
                  <button type="button" className="ui-btn ui-btn-primary" onClick={() => setOpenKey(game.key)}>
                    {played ? "เล่นอีกครั้ง" : "เริ่มเล่น"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="ui-card games-wins">
        <div>
          <p className="games-wins-eyebrow">Your small wins</p>
          <h2>ทุกครั้งที่ลอง มีความหมาย</h2>
          <p className="ui-muted">รับคะแนนครั้งแรกของแต่ละเกมในรอบวันนี้ เล่นซ้ำได้โดยไม่ต้องกังวลเรื่องคะแนน</p>
        </div>
        <ul className="games-wins-badges">
          {GAMES.map((game) => (
            <li key={game.key} className={status.games[game.key].played ? "is-earned" : ""}>
              <span aria-hidden="true"><game.icon size={20} /></span>
              <small>{game.title}</small>
            </li>
          ))}
        </ul>
      </section>

      {radar && <RecoveryRadarChart data={radar} />}

      <section className="ui-card games-cta">
        <span className="games-cta-icon" aria-hidden="true"><Leaf size={20} /></span>
        <div>
          <strong>พร้อมเปลี่ยนสิ่งที่เรียนรู้เป็นการลงมือทำ?</strong>
          <span>เลือกภารกิจเล็ก ๆ ที่เหมาะกับคุณวันนี้</span>
        </div>
        <Link to="/streak#daily-activities" className="ui-btn ui-btn-outline">ไปที่ภารกิจของฉัน</Link>
      </section>

      {openGame && (
        <GameModal title={openGame.title} subtitle={openGame.description} onClose={closeGame}>
          {openGame.key === "memory" && <CopingMemoryGame onPlayed={refresh} onClose={closeGame} />}
          {openGame.key === "quiz" && <DailyQuiz onPlayed={refresh} onClose={closeGame} />}
          {openGame.key === "wheel" && <SpinWheel segments={status.wheelSegments || []} onPlayed={refresh} onClose={closeGame} />}
        </GameModal>
      )}
    </div>
  );
}

export default RecoveryGame;
