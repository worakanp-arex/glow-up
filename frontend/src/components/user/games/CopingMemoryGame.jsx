import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, ShieldCheck, Zap } from "lucide-react";
import AsyncState from "../../common/AsyncState.jsx";
import * as gameService from "../../../services/gameService.js";
import { GameResult } from "./GameShell.jsx";
import { shuffle } from "./shuffle.js";
import "./CopingMemoryGame.css";

function buildDeck(pairs) {
  const cards = [];
  pairs.forEach((pair) => {
    cards.push({ cardId: `${pair.id}-trigger`, pairId: pair.id, text: pair.trigger, kind: "trigger" });
    cards.push({ cardId: `${pair.id}-coping`, pairId: pair.id, text: pair.coping, kind: "coping" });
  });
  return shuffle(cards);
}

// Match each trigger card with its healthy coping response.
function CopingMemoryGame({ onPlayed, onClose }) {
  const [pairs, setPairs] = useState(null);
  const [deck, setDeck] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(() => new Set());
  const [moves, setMoves] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const submittedRef = useRef(false);

  useEffect(() => {
    gameService
      .getMemoryPairs()
      .then((data) => {
        setPairs(data.pairs);
        setDeck(buildDeck(data.pairs));
      })
      .catch((err) => setError(err.response?.data?.message || "โหลดเกมไม่สำเร็จ"));
  }, []);

  const allMatched = pairs && matched.size === pairs.length;

  useEffect(() => {
    if (!allMatched || submittedRef.current) return;
    submittedRef.current = true;
    gameService
      .submitMemoryResult(moves)
      .then((data) => {
        setResult(data);
        onPlayed?.();
      })
      .catch((err) => setError(err.response?.data?.message || "บันทึกผลไม่สำเร็จ"));
  }, [allMatched, moves, onPlayed]);

  const restart = useCallback(() => {
    submittedRef.current = false;
    setDeck(buildDeck(pairs));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setResult(null);
    setError("");
  }, [pairs]);

  function handleFlip(card) {
    if (flipped.length === 2 || flipped.includes(card.cardId) || matched.has(card.pairId)) return;
    const nextFlipped = [...flipped, card.cardId];
    setFlipped(nextFlipped);
    if (nextFlipped.length < 2) return;

    setMoves((m) => m + 1);
    const [first, second] = nextFlipped.map((id) => deck.find((c) => c.cardId === id));
    if (first.pairId === second.pairId) {
      setTimeout(() => {
        setMatched((prev) => new Set(prev).add(first.pairId));
        setFlipped([]);
      }, 350);
    } else {
      setTimeout(() => setFlipped([]), 900);
    }
  }

  if (!pairs) return error ? <p className="game-error">{error}</p> : <AsyncState />;

  if (result) {
    return (
      <GameResult
        headline="จับคู่ครบทุกคู่แล้ว!"
        detail={`ใช้ไปทั้งหมด ${moves} ครั้ง${moves <= pairs.length + 2 ? " — ความจำเยี่ยมมาก" : ""}`}
        pointsAwarded={result.pointsAwarded}
        practice={result.practice}
        onReplay={restart}
        onClose={onClose}
      >
        <ul className="memory-recap">
          {pairs.map((pair) => (
            <li key={pair.id}><span>{pair.trigger}</span><span aria-hidden="true">→</span><strong>{pair.coping}</strong></li>
          ))}
        </ul>
      </GameResult>
    );
  }

  return (
    <div className="memory-game">
      <div className="game-hud">
        <span>จับคู่ <b>{matched.size}</b> / {pairs.length}</span>
        <span>เปิดไปแล้ว <b>{moves}</b> ครั้ง</span>
      </div>
      <p className="memory-legend">
        <span className="memory-legend-trigger"><Zap size={13} aria-hidden="true" />สิ่งกระตุ้น</span>
        <span className="memory-legend-coping"><ShieldCheck size={13} aria-hidden="true" />วิธีรับมือ</span>
      </p>
      <ul className="memory-grid">
        {deck.map((card) => {
          const isMatched = matched.has(card.pairId);
          const isOpen = isMatched || flipped.includes(card.cardId);
          return (
            <li key={card.cardId}>
              <button
                type="button"
                className={`memory-card memory-card-${card.kind}${isOpen ? " is-open" : ""}${isMatched ? " is-matched" : ""}`}
                onClick={() => handleFlip(card)}
                disabled={isMatched}
                aria-label={isOpen ? card.text : "การ์ดคว่ำอยู่ แตะเพื่อเปิด"}
              >
                <span className="memory-card-inner">
                  <span className="memory-card-back" aria-hidden="true"><Heart size={22} /></span>
                  <span className="memory-card-front">
                    {card.kind === "trigger" ? <Zap size={14} aria-hidden="true" /> : <ShieldCheck size={14} aria-hidden="true" />}
                    {card.text}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="game-error">{error}</p>}
    </div>
  );
}

export default CopingMemoryGame;
