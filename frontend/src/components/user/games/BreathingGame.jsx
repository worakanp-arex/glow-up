import { useCallback, useEffect, useRef, useState } from "react";
import * as gameService from "../../../services/gameService.js";
import { GameResult } from "./GameShell.jsx";
import "./BreathingGame.css";

// การหายใจ 4-7-8: หายใจเข้า 4 วินาที กลั้น 7 วินาที หายใจออก 8 วินาที
const PHASES = [
  { key: "inhale", label: "หายใจเข้าทางจมูก", seconds: 4 },
  { key: "hold", label: "กลั้นลมหายใจไว้", seconds: 7 },
  { key: "exhale", label: "ผ่อนลมหายใจออกทางปาก", seconds: 8 },
];
const ROUNDS = 4;

function BreathingGame({ onPlayed, onClose }) {
  const [stage, setStage] = useState("intro");
  const [completed, setCompleted] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [remaining, setRemaining] = useState(PHASES[0].seconds);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submitted = useRef(false);

  const finish = useCallback(async (rounds) => {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    setError("");
    try {
      const data = await gameService.submitBreathing(rounds);
      setResult(data);
      setStage("done");
      onPlayed?.();
    } catch (err) {
      submitted.current = false;
      setError(err.response?.data?.message || "บันทึกผลไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }, [onPlayed]);

  // เดินหนึ่งจังหวะต่อวินาทีขณะที่ session ทำงาน
  useEffect(() => {
    if (stage !== "running") return undefined;
    const timer = setTimeout(() => {
      if (remaining > 1) {
        setRemaining(remaining - 1);
        return;
      }
      if (phaseIndex < PHASES.length - 1) {
        setPhaseIndex(phaseIndex + 1);
        setRemaining(PHASES[phaseIndex + 1].seconds);
        return;
      }
      const done = completed + 1;
      setCompleted(done);
      if (done >= ROUNDS) {
        finish(done);
      } else {
        setPhaseIndex(0);
        setRemaining(PHASES[0].seconds);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [stage, remaining, phaseIndex, completed, finish]);

  function start() {
    submitted.current = false;
    setResult(null);
    setCompleted(0);
    setPhaseIndex(0);
    setRemaining(PHASES[0].seconds);
    setError("");
    setStage("running");
  }

  if (stage === "done" && result) {
    return (
      <GameResult
        headline="ใจสงบลงแล้ว ทำได้ดีมาก"
        detail={`หายใจครบ ${result.rounds} รอบ`}
        pointsAwarded={result.pointsAwarded}
        practice={result.practice}
        onReplay={start}
        onClose={onClose}
      />
    );
  }

  if (stage === "intro") {
    return (
      <div className="breathing-game">
        <div className="breathing-orb is-idle" aria-hidden="true"><span>4-7-8</span></div>
        <p className="breathing-intro">นั่งสบาย ๆ แล้วหายใจตามวงกลม ทำ {ROUNDS} รอบ ใช้เวลาประมาณ 1 นาทีครึ่ง</p>
        <ol className="breathing-steps">
          {PHASES.map((phase) => <li key={phase.key}><b>{phase.seconds} วินาที</b> {phase.label}</li>)}
        </ol>
        {error && <p className="game-error">{error}</p>}
        <button type="button" className="ui-btn ui-btn-primary" onClick={start}>เริ่มหายใจ</button>
      </div>
    );
  }

  const phase = PHASES[phaseIndex];
  return (
    <div className="breathing-game">
      <div className="game-hud">
        <span>รอบที่ <b>{Math.min(completed + 1, ROUNDS)}</b> / {ROUNDS}</span>
      </div>
      <div className={`breathing-orb is-${phase.key}`} style={{ "--phase-seconds": `${phase.seconds}s` }} role="timer" aria-live="polite" aria-label={`${phase.label} เหลืออีก ${remaining} วินาที`}>
        <span>{remaining}</span>
      </div>
      <p className="breathing-label">{phase.label}</p>
      {error && <p className="game-error">{error}</p>}
      {completed >= 1 && (
        <button type="button" className="ui-btn ui-btn-outline" onClick={() => finish(completed)} disabled={submitting}>
          {submitting ? "กำลังบันทึก..." : "จบเกมตอนนี้"}
        </button>
      )}
    </div>
  );
}

export default BreathingGame;
