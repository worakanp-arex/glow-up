import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";

// แทนที่ window.confirm/alert ด้วย ConfirmDialog ที่ใช้ร่วมกัน เรนเดอร์
// `confirmDialog` ที่ไหนก็ได้ในคอมโพเนนต์ เรียก `confirm({ title, message,
// confirmLabel, onConfirm })` ไดอะล็อกจะค้างเปิดในสถานะกำลังทำงานขณะ
// onConfirm รัน ปิดเมื่อสำเร็จ และแสดงข้อความ error ถ้า throw
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
