import { useEffect, useState } from "react";
import * as gameService from "../../../services/gameService.js";
import "./DailyQuiz.css";

function DailyQuiz({ status, onPlayed, embedded = false }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    gameService
      .getDailyQuiz()
      .then((data) => setQuestions(data.questions))
      .finally(() => setLoading(false));
  }, []);

  const played = status.played || Boolean(result);
  const answeredAll = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const data = await gameService.submitQuiz(answers);
      setResult(data);
      onPlayed?.();
    } catch (err) {
      setError(err.response?.data?.message || "ส่งคำตอบไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  if (played) {
    return (
      <div className={`daily-quiz-card${embedded ? " embedded" : ""}`}>
        <p className="daily-quiz-done">
          ทำแล้ววันนี้ · ตอบถูก {result ? `${result.correctCount}/${result.total} ข้อ` : status.resultLabel}
        </p>
      </div>
    );
  }

  return (
    <div className={`daily-quiz-card${embedded ? " embedded" : ""}`}>
      {loading ? (
        <p>กำลังโหลด...</p>
      ) : (
        <div className="daily-quiz-list">
          {questions.map((q, qIndex) => (
            <div key={q.id} className="daily-quiz-question">
              <p className="daily-quiz-question-text">
                {qIndex + 1}. {q.question}
              </p>
              <div className="daily-quiz-options">
                {q.options.map((option, optIndex) => (
                  <label key={optIndex} className="daily-quiz-option">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === optIndex}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: optIndex }))}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="daily-quiz-error">{error}</p>}
      {!loading && (
        <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={!answeredAll || submitting}>
          {submitting ? "กำลังส่ง..." : "ส่งคำตอบ"}
        </button>
      )}
    </div>
  );
}

export default DailyQuiz;
