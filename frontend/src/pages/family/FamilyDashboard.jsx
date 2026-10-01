import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Award, Flame, Heart, Send, Sparkles, TrendingUp, Users } from "lucide-react";
import * as familyService from "../../services/familyService.js";
import FamilyMissionsWidget from "../../components/common/FamilyMissionsWidget.jsx";
import "./FamilyDashboard.css";

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function FamilyDashboard({ links }) {
  const [selectedLinkId, setSelectedLinkId] = useState(links[0]._id);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

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
    try {
      await familyService.sendEncouragementMessage(selectedLinkId, message.trim());
      setMessage("");
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  return (
    <div className="family-dashboard-page">
      <div className="family-dashboard-header">
        <PageHeader icon={Heart}>ติดตามความคืบหน้า</PageHeader>
        {links.length > 1 && (
          <select value={selectedLinkId} onChange={(e) => setSelectedLinkId(e.target.value)}>
            {links.map((link) => (
              <option key={link._id} value={link._id}>
                {link.recoveringUser.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="family-dashboard-note">
        <Users size={14} />
        <span>คุณเห็นเฉพาะระดับความสำเร็จของ{loading ? "..." : summary?.name} ไม่เห็นข้อมูลสุขภาพโดยละเอียด</span>
      </p>

      {loading || !summary ? (
        <div className="family-dashboard-loading"><AsyncState /></div>
      ) : (
        <>
          <div className="family-dashboard-hero">
            <span className="family-dashboard-avatar">
              {summary.avatarUrl ? <img src={summary.avatarUrl} alt="" /> : initials(summary.name)}
            </span>
            <h2>{summary.name}</h2>
            {summary.currentStageLabel && <p className="family-dashboard-stage">{summary.currentStageLabel}</p>}
          </div>

          {summary.sharing?.progress === false ? (
            <p className="family-dashboard-note">
              <Users size={14} />
              <span>{summary.name} เลือกยังไม่แบ่งปันระดับและความสำเร็จในตอนนี้ คุณยังส่งกำลังใจได้เสมอ</span>
            </p>
          ) : (
          <div className="family-dashboard-stats">
            <div className="family-dashboard-stat-card">
              <Flame size={20} />
              <span className="family-dashboard-stat-value">{summary.currentStreak}</span>
              <span className="family-dashboard-stat-label">วันติดต่อกัน</span>
            </div>
            <div className="family-dashboard-stat-card">
              <Award size={20} />
              <span className="family-dashboard-stat-value">{summary.longestStreak}</span>
              <span className="family-dashboard-stat-label">สถิติสูงสุด</span>
            </div>
            <div className="family-dashboard-stat-card">
              <Sparkles size={20} />
              <span className="family-dashboard-stat-value">{summary.completedMissions}</span>
              <span className="family-dashboard-stat-label">ภารกิจสำเร็จ</span>
            </div>
            <div className="family-dashboard-stat-card">
              <TrendingUp size={20} />
              <span className="family-dashboard-stat-value">{summary.level}</span>
              <span className="family-dashboard-stat-label">เลเวล</span>
            </div>
          </div>
          )}

          {summary.rewardsEarned.length > 0 && (
            <div className="family-dashboard-rewards">
              <h3>รางวัลที่ได้รับ</h3>
              <ul>
                {summary.rewardsEarned.map((reward, i) => (
                  <li key={i}>{reward.name}</li>
                ))}
              </ul>
            </div>
          )}

          <FamilyMissionsWidget />

          <form className="family-dashboard-message-form" onSubmit={handleSendMessage}>
            <h3>ส่งข้อความให้กำลังใจ</h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`เขียนข้อความให้กำลังใจถึง ${summary.name}...`}
              rows={3}
              maxLength={500}
            />
            {sent && <p className="family-dashboard-message-sent">ส่งข้อความแล้ว!</p>}
            <button type="submit" className="btn btn-primary" disabled={sending || !message.trim()}>
              <Send size={15} />
              <span>{sending ? "กำลังส่ง..." : "ส่งกำลังใจ"}</span>
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default FamilyDashboard;
