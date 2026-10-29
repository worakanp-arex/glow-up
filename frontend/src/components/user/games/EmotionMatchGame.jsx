import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import AsyncState from "../../common/AsyncState.jsx";
import * as gameService from "../../../services/gameService.js";
import { GameResult } from "./GameShell.jsx";
import "./EmotionMatchGame.css";

// 5 สถานการณ์ของวันนี้: เลือกความรู้สึกที่เหมาะสม เพื่อฝึกสังเกต
// ว่าเรารู้สึกอย่างไรก่อนตัดสินใจว่าจะทำอะไร
function EmotionMatchGame({ onPlayed, onClose }) {
  const [questions, setQuestions] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    gameService
      .getEmotionToday()
      .then((data) => setQuestions(data.questions))
      .catch((err) => setError(err.response?.data?.message || "โหลดคำถามไม่สำเร็จ"));
  }, []);

  function restart() {
    setStep(0);
    setAnswers({});
    setResult(null);
    setError("");
  }

  async function submit(finalAnswers) {
    setSubmitting(true);
    setError("");
    try {
      const data = await gameService.submitEmotion(finalAnswers);
      setResult(data);
      onPlayed?.();
    } catch (err) {
      setError(err.response?.data?.message || "ส่งคำตอบไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  if (!questions) return error ? <p className="game-error">{error}</p> : <AsyncState />;

  if (result) {
    const correctById = new Map((result.answerKey || []).map((item) => [item.id, item.correct]));
    return (
      <GameResult
        headline={result.correctCount === result.total ? "อ่านความรู้สึกได้แม่นมาก!" : "จบรอบแล้ว"}
        detail={`ตอบถูก ${result.correctCount} จาก ${result.total} ข้อ`}
        pointsAwarded={result.pointsAwarded}
        practice={result.practice}
        onReplay={restart}
        onClose={onClose}
      >
        <ol className="quiz-review">
          {questions.map((question) => {
            const correct = correctById.get(question.id);
            const ok = answers[question.id] === correct;
            const label = question.options.find((option) => option.key === correct)?.label;
            return (
              <li key={question.id} className={ok ? "is-right" : "is-wrong"}>
                {ok ? <CheckCircle2 size={18} aria-label="ถูก" /> : <XCircle size={18} aria-label="ผิด" />}
                <div>
                  <p>{question.situation}</p>
                  {label && <small>ความรู้สึกที่น่าจะเป็น: {label}</small>}
                </div>
              </li>
            );
          })}
        </ol>
      </GameResult>
    );
  }

  const question = questions[step];
  const chosen = answers[question.id];
  const isLast = step === questions.length - 1;

  function next() {
    if (isLast) submit(answers);
    else setStep((s) => s + 1);
  }

  return (
    <div className="emotion-game">
      <div className="game-hud">
        <span>ข้อ <b>{step + 1}</b> / {questions.length}</span>
        <div className="quiz-dots" aria-hidden="true">
          {questions.map((q, i) => <span key={q.id} className={i < step ? "done" : i === step ? "current" : ""} />)}
        </div>
      </div>

      <p className="emotion-situation">{question.situation}</p>
      <p className="emotion-prompt">คุณคิดว่าความรู้สึกไหนใกล้เคียงที่สุด?</p>
      <div className="emotion-options" role="radiogroup" aria-label={question.situation}>
        {question.options.map((option) => (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={chosen === option.key}
            className={`emotion-option${chosen === option.key ? " is-chosen" : ""}`}
            onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.key }))}
          >
            <img src={`/images/illustrations/mood-${option.key}.webp`} alt="" width="64" height="64" loading="lazy" />
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {error && <p className="game-error">{error}</p>}

      <div className="quiz-nav">
        <button type="button" className="ui-btn ui-btn-outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || submitting}>ย้อนกลับ</button>
        <button type="button" className="ui-btn ui-btn-primary" onClick={next} disabled={chosen === undefined || submitting}>
          {submitting ? "กำลังตรวจคำตอบ..." : isLast ? "ส่งคำตอบ" : "ข้อต่อไป"}
        </button>
      </div>
    </div>
  );
}

export default EmotionMatchGame;
