import { useEffect, useState } from "react";
import * as gameService from "../../../services/gameService.js";
import "./CopingMemoryGame.css";

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck(pairs) {
  const cards = [];
  pairs.forEach((pair) => {
    cards.push({ cardId: `${pair.id}-trigger`, pairId: pair.id, text: pair.trigger, kind: "trigger" });
    cards.push({ cardId: `${pair.id}-coping`, pairId: pair.id, text: pair.coping, kind: "coping" });
  });
  return shuffle(cards);
}

function CopingMemoryGame({ status, onPlayed, embedded = false }) {
  const [pairs, setPairs] = useState(null);
  const [deck, setDeck] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    gameService.getMemoryPairs().then((data) => {
      setPairs(data.pairs);
      setDeck(buildDeck(data.pairs));
    });
  }, []);

  const played = status.played || Boolean(result);
  const allMatched = pairs && matched.size === pairs.length;

  useEffect(() => {
    if (!allMatched || played || submitting || submitAttempted) return;
    setSubmitting(true);
    setSubmitAttempted(true);
    gameService
      .submitMemoryResult(moves)
      .then((data) => {
        setResult(data.play);
        onPlayed?.();
      })
      .catch((err) => setError(err.response?.data?.message || "บันทึกผลไม่สำเร็จ"))
      .finally(() => setSubmitting(false));
  }, [allMatched, played, submitting, submitAttempted, moves, onPlayed]);

  function handleFlip(card) {
    if (played || flipped.length === 2 || flipped.includes(card.cardId) || matched.has(card.pairId)) return;
    const nextFlipped = [...flipped, card.cardId];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstId, secondId] = nextFlipped;
      const first = deck.find((c) => c.cardId === firstId);
      const second = deck.find((c) => c.cardId === secondId);
      if (first.pairId === second.pairId) {
        setMatched((prev) => new Set(prev).add(first.pairId));
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  }

  if (played) {
    return (
      <div className={`coping-memory-card${embedded ? " embedded" : ""}`}>
        <p className="coping-memory-done">เล่นแล้ววันนี้ · {result?.resultLabel || status.resultLabel}</p>
      </div>
    );
  }

  return (
    <div className={`coping-memory-card${embedded ? " embedded" : ""}`}>
      <p className="coping-memory-hint">จับคู่ "สิ่งกระตุ้น" กับ "วิธีรับมือที่เหมาะสม" ให้ครบทุกคู่ ยิ่งใช้จำนวนครั้งน้อยยิ่งได้แต้มมาก</p>
      <p className="coping-memory-moves">จำนวนครั้งที่เปิด: {moves}</p>
      {!deck.length ? (
        <p>กำลังโหลด...</p>
      ) : (
        <div className="coping-memory-grid">
          {deck.map((card) => {
            const isFlipped = flipped.includes(card.cardId) || matched.has(card.pairId);
            return (
              <button
                key={card.cardId}
                type="button"
                className={`coping-memory-tile${isFlipped ? " flipped" : ""}${matched.has(card.pairId) ? " matched" : ""}`}
                onClick={() => handleFlip(card)}
              >
                {isFlipped ? card.text : "?"}
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="coping-memory-error">{error}</p>}
    </div>
  );
}

export default CopingMemoryGame;
