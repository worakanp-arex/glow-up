import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";

// เหมือน useConfirmDialog แต่ไดอะล็อกขอเหตุผลเป็นลายลักษณ์อักษรด้วย เช่น
// ตอนปฏิเสธสิ่งใดเพื่อให้อีกฝ่ายรู้เหตุผล
// `askReason({ title, description, label, placeholder, confirmLabel, required,
// onConfirm(reason) })` เรนเดอร์ `reasonDialog` ที่ไหนก็ได้ในคอมโพเนนต์
export default function useReasonDialog() {
  const [request, setRequest] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function open(next) {
    setReason("");
    setError("");
    setRequest(next);
  }

  function close() {
    if (busy) return;
    setRequest(null);
    setError("");
  }

  async function handleConfirm() {
    setBusy(true);
    setError("");
    try {
      await request.onConfirm(reason.trim());
      setRequest(null);
    } catch (err) {
      setError(err.response?.data?.message || "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  const required = request?.required !== false;
  const reasonDialog = request && (
    <ConfirmDialog
      title={request.title}
      confirmLabel={request.confirmLabel}
      busy={busy}
      error={error}
      confirmDisabled={required && !reason.trim()}
      onConfirm={handleConfirm}
      onClose={close}
    >
      {request.description && <p>{request.description}</p>}
      <label className="reason-dialog-field">
        <span>{request.label || "เหตุผล"}{required ? "" : " (ไม่บังคับ)"}</span>
        <textarea
          value={reason}
          rows={4}
          maxLength={500}
          placeholder={request.placeholder || "พิมพ์เหตุผลสั้น ๆ ที่ผู้รับจะเห็น"}
          onChange={(event) => setReason(event.target.value)}
        />
        <small>{reason.length}/500</small>
      </label>
    </ConfirmDialog>
  );

  return { askReason: open, reasonDialog };
}
