import { useEffect, useState } from "react";
import { AlertCircle, WifiOff, X } from "lucide-react";
export default function RequestFeedback() {
  const [notice, setNotice] = useState(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const onError = (event) => setNotice(event.detail);
    const onOffline = () => setOffline(true), onOnline = () => setOffline(false);
    window.addEventListener("api-error", onError);
    window.addEventListener("offline", onOffline); window.addEventListener("online", onOnline);
    return () => { window.removeEventListener("api-error", onError); window.removeEventListener("offline", onOffline); window.removeEventListener("online", onOnline); };
  }, []);
  if (!notice && !offline) return null;
  return <div className="request-feedback" role="alert">{offline ? <WifiOff size={20} /> : <AlertCircle size={20} />}
    <div><strong>{offline ? "คุณกำลังออฟไลน์" : "ทำรายการไม่สำเร็จ"}</strong><p>{offline ? "เชื่อมต่ออินเทอร์เน็ตเพื่อบันทึกและโหลดข้อมูล" : notice.message}</p>
    {!offline && notice.retry && <button type="button" onClick={() => window.location.reload()}>โหลดหน้านี้ใหม่</button>}</div>
    {!offline && <button className="icon-button" onClick={() => setNotice(null)} aria-label="ปิดข้อความ"><X size={18} /></button>}</div>;
}
