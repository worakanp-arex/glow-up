import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import "./ConfirmDialog.css";

// `wide` gives pickers and forms more room; `confirmDisabled` keeps the confirm
// button off until the content (e.g. a required reason) is filled in.
export default function ConfirmDialog({ title, children, confirmLabel = "ยืนยัน", busy, error, onConfirm, onClose, confirmDisabled = false, wide = false }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previousFocus?.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className={`confirm-dialog${wide ? " confirm-dialog-wide" : ""}`} aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id={id}>{title}</h2>
    <div>{children}</div>
    {error && <p className="dialog-error" role="alert">{error}</p>}
    <div className="confirm-dialog-actions">
      <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy} autoFocus>ยกเลิก</button>
      <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={busy || confirmDisabled}>{busy ? "กำลังดำเนินการ..." : confirmLabel}</button>
    </div>
  </dialog>, document.body);
}
