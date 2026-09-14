import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import "./ConfirmDialog.css";

export default function ConfirmDialog({ title, children, confirmLabel = "ยืนยัน", busy, error, onConfirm, onClose }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previousFocus?.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className="confirm-dialog" aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id={id}>{title}</h2>
    <div>{children}</div>
    {error && <p className="dialog-error" role="alert">{error}</p>}
    <div className="confirm-dialog-actions">
      <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy} autoFocus>ยกเลิก</button>
      <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={busy}>{busy ? "กำลังดำเนินการ..." : confirmLabel}</button>
    </div>
  </dialog>, document.body);
}
