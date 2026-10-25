import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";

// A wide dialog for creating or editing one record. `onSave` does the request;
// the dialog stays open with the server's message if it throws, and closes
// itself when it succeeds.
export default function EditorDialog({ title, onSave, onClose, children, saveLabel = "บันทึก", saveDisabled = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      await onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog title={title} wide confirmLabel={saveLabel} busy={busy} error={error} confirmDisabled={saveDisabled} onConfirm={save} onClose={onClose}>
      <form className="editor-dialog-form" onSubmit={(event) => { event.preventDefault(); if (!saveDisabled) save(); }}>
        {children}
      </form>
    </ConfirmDialog>
  );
}
