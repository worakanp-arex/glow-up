import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import AsyncState from "../../common/AsyncState.jsx";
import * as gameService from "../../../services/gameService.js";
import { GameResult } from "./GameShell.jsx";
import "./DailyQuiz.css";

const LETTERS = ["ก", "ข", "ค", "ง"];

// Today's 3 recovery-knowledge questions, one at a time.
function DailyQuiz({ onPlayed, onClose }) {
  const [questions, setQuestions] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    gameService
      .getDailyQuiz()
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
      const data = await gameService.submitQuiz(finalAnswers);
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
    const keyById = new Map((result.answerKey || []).map((k) => [k.id, k.correctIndex]));
    return (
      <GameResult
        headline={result.correctCount === result.total ? "ตอบถูกทุกข้อ เยี่ยมมาก!" : "จบรอบแล้ว"}
        detail={`ตอบถูก ${result.correctCount} จาก ${result.total} ข้อ`}
        pointsAwarded={result.pointsAwarded}
        practice={result.practice}
        onReplay={restart}
        onClose={onClose}
      >
        <ol className="quiz-review">
          {questions.map((q) => {
            const correct = keyById.get(q.id);
            const ok = answers[q.id] === correct;
            return (
              <li key={q.id} className={ok ? "is-right" : "is-wrong"}>
                {ok ? <CheckCircle2 size={18} aria-label="ถูก" /> : <XCircle size={18} aria-label="ผิด" />}
                <div>
                  <p>{q.question}</p>
                  {correct !== undefined && <small>คำตอบที่เหมาะสม: {q.options[correct]}</small>}
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

  function choose(index) {
    setAnswers((prev) => ({ ...prev, [question.id]: index }));
  }

  function next() {
    if (isLast) submit(answers);
    else setStep((s) => s + 1);
  }

  return (
    <div className="quiz-game">
      <div className="game-hud">
        <span>ข้อ <b>{step + 1}</b> / {questions.length}</span>
        <div className="quiz-dots" aria-hidden="true">
          {questions.map((q, i) => <span key={q.id} className={i < step ? "done" : i === step ? "current" : ""} />)}
        </div>
      </div>

      <h3 className="quiz-question">{question.question}</h3>
      <div className="quiz-options" role="radiogroup" aria-label={question.question}>
        {question.options.map((option, index) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={chosen === index}
            className={`quiz-option${chosen === index ? " is-chosen" : ""}`}
            onClick={() => choose(index)}
          >
            <span className="quiz-option-letter" aria-hidden="true">{LETTERS[index] ?? index + 1}</span>
            <span>{option}</span>
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

export default DailyQuiz;
