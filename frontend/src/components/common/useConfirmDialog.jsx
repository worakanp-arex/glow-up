import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";

// Replaces window.confirm/alert with the shared ConfirmDialog. Render
// `confirmDialog` anywhere in the component; call `confirm({ title, message,
// confirmLabel, onConfirm })`. The dialog stays open with a busy state while
// onConfirm runs, closes on success, and shows the error message if it throws.
export default function useConfirmDialog() {
  const [request, setRequest] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (busy) return;
    setRequest(null);
    setError("");
  }

  async function handleConfirm() {
    setBusy(true);
    setError("");
    try {
      await request.onConfirm();
      setRequest(null);
    } catch (err) {
      setError(err.response?.data?.message || request.errorMessage || "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  const confirmDialog = request && (
    <ConfirmDialog title={request.title} confirmLabel={request.confirmLabel} busy={busy} error={error} onConfirm={handleConfirm} onClose={close}>
      <p>{request.message}</p>
    </ConfirmDialog>
  );

  return { confirm: setRequest, confirmDialog };
}
