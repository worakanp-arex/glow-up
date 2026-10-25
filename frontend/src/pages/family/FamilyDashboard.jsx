import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import FamilyMessageHistory from "../../components/common/FamilyMessageHistory.jsx";
import { useEffect, useState } from "react";
import { Award, Flame, Heart, Send, Sparkles, TrendingUp, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as familyService from "../../services/familyService.js";
import FamilyMissionsWidget from "../../components/common/FamilyMissionsWidget.jsx";
import "./FamilyDashboard.css";

const QUICK_MESSAGES = ["สู้ ๆ นะ เราอยู่ข้าง ๆ เสมอ", "ภูมิใจในตัวเธอมากนะ", "วันนี้เป็นอย่างไรบ้าง ถ้าเหนื่อยพักก่อนก็ได้"];

function FamilyDashboard({ links }) {
  const { user } = useAuth();
  const [selectedLinkId, setSelectedLinkId] = useState(links[0]._id);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    familyService
      .getLinkedUserSummary(selectedLinkId)
      .then(setSummary)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, [selectedLinkId]);

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setSent(false);
    setSendError("");
    try {
      await familyService.sendEncouragementMessage(selectedLinkId, message.trim());
      setMessage("");
      setSent(true);
      setHistoryKey((key) => key + 1);
    } catch (err) {
      setSendError(err.response?.data?.message || "ส่งข้อความไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setSending(false);
    }
  }

  if (loadError) return <div className="family-dashboard-page"><AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  const viewerRole = user.role === "family" ? "family" : "user";

  return (
    <div className="family-dashboard-page">
      <PageHeader
        art="family"
        icon={Heart}
        eyebrow="Family space"
        description="เห็นความก้าวหน้าเท่าที่เจ้าของข้อมูลอนุญาต และส่งกำลังใจถึงกันได้ทุกวัน"
        actions={links.length > 1 && (
          <select className="family-dashboard-select" aria-label="เลือกสมาชิกที่ติดตาม" value={selectedLinkId} onChange={(e) => setSelectedLinkId(e.target.value)}>
            {links.map((link) => (
              <option key={link._id} value={link._id}>
                {link.recoveringUser.name}
              </option>
            ))}
          </select>
        )}
      >ติดตามความคืบหน้า</PageHeader>

      {loading || !summary ? (
        <div className="family-dashboard-loading"><AsyncState /></div>
      ) : (
        <>
          <section className="family-dashboard-hero">
            <Avatar user={summary} size={92} alt="" className="family-dashboard-avatar" />
            <div className="family-dashboard-hero-copy">
              {summary.familyName && <p className="family-dashboard-family-name"><Users size={14} aria-hidden="true" />{summary.familyName}</p>}
              <h2>{summary.name}</h2>
              {summary.currentStageLabel && <p className="family-dashboard-stage">{summary.currentStageLabel}</p>}
              <p className="family-dashboard-note">
                <Users size={14} aria-hidden="true" />
                <span>คุณเห็นเฉพาะระดับความสำเร็จของ{summary.name} ไม่เห็นข้อมูลสุขภาพโดยละเอียด</span>
              </p>
            </div>
          </section>

          <div className="family-dashboard-grid">
            <div className="family-dashboard-main">
              <form className="ui-card ui-card-soft family-dashboard-message-form" onSubmit={handleSendMessage}>
                <div className="family-dashboard-message-head">
                  <span className="family-dashboard-message-icon" aria-hidden="true"><Heart size={20} /></span>
                  <div>
                    <h3>ส่งข้อความให้กำลังใจ</h3>
                    <p>ข้อความจะแสดงบนหน้าหลักของ{summary.name} และเขาตอบกลับได้</p>
                  </div>
                </div>
                <div className="family-dashboard-quick" role="group" aria-label="ข้อความแนะนำ">
                  {QUICK_MESSAGES.map((text) => (
                    <button key={text} type="button" onClick={() => setMessage(text)}>{text}</button>
                  ))}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`เขียนข้อความให้กำลังใจถึง ${summary.name}...`}
                  aria-label="ข้อความให้กำลังใจ"
                  rows={4}
                  maxLength={500}
                />
                {sent && <p className="family-dashboard-message-sent" role="status">ส่งข้อความแล้ว!</p>}
                {sendError && <p className="family-dashboard-message-error" role="alert">{sendError}</p>}
                <button type="submit" className="ui-btn ui-btn-primary" disabled={sending || !message.trim()}>
                  <Send size={15} aria-hidden="true" />
                  <span>{sending ? "กำลังส่ง..." : "ส่งกำลังใจ"}</span>
                </button>
              </form>

              {summary.sharing?.progress === false ? (
                <p className="ui-card family-dashboard-hidden">
                  <Users size={14} aria-hidden="true" />
                  <span>{summary.name} เลือกยังไม่แบ่งปันระดับและความสำเร็จในตอนนี้ คุณยังส่งกำลังใจได้เสมอ</span>
                </p>
              ) : (
                <div className="family-dashboard-stats">
                  <div className="family-dashboard-stat-card">
                    <Flame size={20} aria-hidden="true" />
                    <span className="family-dashboard-stat-value">{summary.currentStreak}</span>
                    <span className="family-dashboard-stat-label">วันติดต่อกัน</span>
                  </div>
                  <div className="family-dashboard-stat-card">
                    <Award size={20} aria-hidden="true" />
                    <span className="family-dashboard-stat-value">{summary.longestStreak}</span>
                    <span className="family-dashboard-stat-label">สถิติสูงสุด</span>
                  </div>
                  <div className="family-dashboard-stat-card">
                    <Sparkles size={20} aria-hidden="true" />
                    <span className="family-dashboard-stat-value">{summary.completedMissions}</span>
                    <span className="family-dashboard-stat-label">ภารกิจสำเร็จ</span>
                  </div>
                  <div className="family-dashboard-stat-card">
                    <TrendingUp size={20} aria-hidden="true" />
                    <span className="family-dashboard-stat-value">{summary.level}</span>
                    <span className="family-dashboard-stat-label">เลเวล</span>
                  </div>
                </div>
              )}

              <FamilyMissionsWidget />

              {summary.rewardsEarned.length > 0 && (
                <section className="ui-card family-dashboard-rewards">
                  <h3>รางวัลที่ได้รับ</h3>
                  <ul>
                    {summary.rewardsEarned.map((reward, i) => (
                      <li key={i}>{reward.name}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className="family-dashboard-side">
              <FamilyMessageHistory linkId={selectedLinkId} viewerRole={viewerRole} refreshKey={historyKey} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

export default FamilyDashboard;
