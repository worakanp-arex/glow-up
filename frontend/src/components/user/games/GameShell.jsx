import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PartyPopper, RotateCcw, Sparkles, X } from "lucide-react";
import "./GameShell.css";

// Full-screen-ish dialog every mini-game plays inside.
export function GameModal({ title, subtitle, onClose, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="game-modal-overlay" onClick={onClose}>
      <div
        className="game-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-modal-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="game-modal-head">
          <div>
            <h2 id="game-modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="ปิดเกม">
            <X size={18} />
          </button>
        </header>
        <div className="game-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// End-of-round screen shared by all games.
export function GameResult({ headline, detail, pointsAwarded, practice, onReplay, onClose, children }) {
  return (
    <div className="game-result" role="status">
      <span className="game-result-icon" aria-hidden="true"><PartyPopper size={28} /></span>
      <h3>{headline}</h3>
      {detail && <p className="game-result-detail">{detail}</p>}
      <p className={`game-result-xp${practice ? " is-practice" : ""}`}>
        <Sparkles size={15} aria-hidden="true" />
        {practice ? "รอบฝึกเล่น — วันนี้รับ XP ของเกมนี้ไปแล้ว" : `ได้รับ +${pointsAwarded} XP`}
      </p>
      {children}
      <div className="game-result-actions">
        <button type="button" className="ui-btn ui-btn-outline" onClick={onClose}>กลับไปเลือกเกม</button>
        <button type="button" className="ui-btn ui-btn-primary" onClick={onReplay}>
          <RotateCcw size={15} aria-hidden="true" />เล่นอีกครั้ง
        </button>
      </div>
    </div>
  );
}
