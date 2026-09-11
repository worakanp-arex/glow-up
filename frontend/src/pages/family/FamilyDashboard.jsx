import { useEffect, useState } from "react";
import { Award, Flame, Heart, Sparkles, Users } from "lucide-react";
import * as familyService from "../../services/familyService.js";
import "./FamilyDashboard.css";

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function FamilyDashboard({ links }) {
  const [selectedLinkId, setSelectedLinkId] = useState(links[0]._id);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    familyService
      .getLinkedUserSummary(selectedLinkId)
      .then(setSummary)
      .finally(() => setLoading(false));
  }, [selectedLinkId]);

  return (
    <div className="family-dashboard-page">
      <div className="family-dashboard-header">
        <h1>
          <Heart size={22} />
          <span>ติดตามความคืบหน้า</span>
        </h1>
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
        <p className="family-dashboard-loading">กำลังโหลด...</p>
      ) : (
        <>
          <div className="family-dashboard-hero">
            <span className="family-dashboard-avatar">
              {summary.avatarUrl ? <img src={summary.avatarUrl} alt="" /> : initials(summary.name)}
            </span>
            <h2>{summary.name}</h2>
            <p className="family-dashboard-stage">{summary.currentStageLabel}</p>
          </div>

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
          </div>

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
        </>
      )}
    </div>
  );
}

export default FamilyDashboard;
