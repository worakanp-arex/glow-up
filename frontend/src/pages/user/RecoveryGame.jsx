import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CheckCircle2, Clock, Flame, Gamepad2, Heart, Leaf, Play, Smile, Sparkles, Star, Wind } from "lucide-react";
import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import ImageSlot from "../../components/common/ImageSlot.jsx";
import * as gameService from "../../services/gameService.js";
import { getMyPointsSummary } from "../../services/missionService.js";
import { GameModal } from "../../components/user/games/GameShell.jsx";
import SpinWheel from "../../components/user/games/SpinWheel.jsx";
import CopingMemoryGame from "../../components/user/games/CopingMemoryGame.jsx";
import DailyQuiz from "../../components/user/games/DailyQuiz.jsx";
import BreathingGame from "../../components/user/games/BreathingGame.jsx";
import EmotionMatchGame from "../../components/user/games/EmotionMatchGame.jsx";
import "./RecoveryGame.css";

// Points mirror the backend scoring in gameController (memory ≤10,
// quiz 3/answer, wheel 3–10, breathing 3–5, emotion 1/answer). Only the first
// play per day earns XP. `art` is shown instead of a photo for games that
// don't have their own card picture.
const GAMES = [
  { key: "memory", title: "จับคู่ ดูแลใจ", description: "ฝึกความจำและการเชื่อมโยง จับคู่สิ่งกระตุ้นกับวิธีรับมือ", level: "สบาย ๆ", tone: "lilac", minutes: 3, xp: "+10 XP", icon: Heart, image: "/images/games/memory.png" },
  { key: "quiz", title: "เลือกทางของคุณ", description: "ฝึกตัดสินใจผ่านสถานการณ์ 3 ข้อ", level: "ลองคิดสักนิด", tone: "peach", minutes: 4, xp: "+9 XP", icon: BookOpen, image: "/images/games/quiz.png" },
  { key: "wheel", title: "วงล้อก้าวเล็ก ๆ", description: "สุ่มไอเดียกิจกรรมสำหรับวันนี้", level: "เริ่มง่าย", tone: "sky", minutes: 1, xp: "+3–10 XP", icon: Star, image: "/images/games/wheel.png" },
  { key: "breathing", title: "หายใจผ่อนคลาย 4-7-8", description: "หายใจตามวงกลม 4 รอบ ช่วยให้ใจสงบเวลาเครียดหรืออยากใช้สาร", level: "ใจสงบ", tone: "sky", minutes: 2, xp: "+5 XP", icon: Wind, art: "mood-calm" },
  { key: "emotion", title: "ฝึกจดจำอารมณ์", description: "จับคู่สถานการณ์กับความรู้สึกที่เกิดขึ้น เพื่อรู้เท่าทันใจตัวเอง", level: "ลองสังเกต", tone: "lilac", minutes: 3, xp: "+1–5 XP", icon: Smile, art: "mood-surprised" },
];

function RecoveryGame() {
  const [status, setStatus] = useState(null);
  const [points, setPoints] = useState(null);
  const [openKey, setOpenKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadAll = useCallback(() => {
    getMyPointsSummary().then(setPoints).catch(() => {});
    return gameService.getGameHubStatus().then(setStatus);
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

  const games = status.games || {};
  const streak = status.streak || { current: 0, longest: 0, playedToday: false };
  const playedCount = GAMES.filter((g) => games[g.key]?.played).length;
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

      <section className={`ui-card games-streak${streak.current > 0 ? " is-active" : ""}`} aria-label="การเล่นต่อเนื่อง">
        <span className="games-streak-icon" aria-hidden="true"><Flame size={22} /></span>
        <div>
          <strong>{streak.current > 0 ? `เล่นต่อเนื่อง ${streak.current} วัน` : "เริ่มสะสมสตรีคกันเลย"}</strong>
          <span>{streak.playedToday ? "วันนี้เล่นแล้ว พรุ่งนี้มาต่อให้สตรีคไม่ขาด" : "เล่นเกมไหนก็ได้ 1 เกมวันนี้ เพื่อต่อสตรีค"}{streak.longest > 0 && ` · สูงสุด ${streak.longest} วัน`}</span>
        </div>
      </section>

      <ul className="games-grid">
        {GAMES.map((game) => {
          const gameStatus = games[game.key] || { played: false };
          const played = gameStatus.played;
          const gameStreak = gameStatus.streak?.current || 0;
          return (
            <li key={game.key} className="ui-card game-card">
              <button type="button" className="game-card-media" onClick={() => setOpenKey(game.key)} aria-label={`เล่น ${game.title}`}>
                {game.image ? <ImageSlot src={game.image} alt="" tone={game.tone} /> : (
                  <span className={`game-card-art game-card-art-${game.tone}`}><img src={`/images/illustrations/${game.art}.webp`} alt="" width="112" height="112" loading="lazy" /></span>
                )}
                <span className="game-card-play" aria-hidden="true"><Play size={16} fill="currentColor" /></span>
              </button>
              <div className="game-card-body">
                <div className="game-card-meta">
                  <span className={`ui-chip ui-chip-${game.tone === "sky" ? "neutral" : game.tone}`}>{game.level}</span>
                  <span className="ui-muted"><Clock size={13} aria-hidden="true" />{game.minutes} นาที</span>
                  {gameStreak > 0 && <span className="game-card-streak" title="เล่นเกมนี้ต่อเนื่อง"><Flame size={13} aria-hidden="true" />{gameStreak} วัน</span>}
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
            <li key={game.key} className={games[game.key]?.played ? "is-earned" : ""}>
              <span aria-hidden="true"><game.icon size={20} /></span>
              <small>{game.title}</small>
            </li>
          ))}
        </ul>
      </section>

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
          {openGame.key === "breathing" && <BreathingGame onPlayed={refresh} onClose={closeGame} />}
          {openGame.key === "emotion" && <EmotionMatchGame onPlayed={refresh} onClose={closeGame} />}
          {openGame.key === "wheel" && <SpinWheel segments={status.wheelSegments || []} onPlayed={refresh} onClose={closeGame} />}
        </GameModal>
      )}
    </div>
  );
}

export default RecoveryGame;
