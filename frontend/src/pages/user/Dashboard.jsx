import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, LayoutDashboard, MessageCircle, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import DailyCheckin from "../../components/user/DailyCheckin.jsx";
import GrowthCard from "../../components/user/GrowthCard.jsx";
import StreakWidget from "../../components/user/StreakWidget.jsx";
import WeeklyCheckInWidget from "../../components/user/WeeklyCheckInWidget.jsx";
import ApplicationStatusCard from "../../components/user/ApplicationStatusCard.jsx";
import MyCoursesWidget from "../../components/user/MyCoursesWidget.jsx";
import CounsellingStatusWidget from "../../components/user/CounsellingStatusWidget.jsx";
import CommunityPreviewWidget from "../../components/user/CommunityPreviewWidget.jsx";
import FamilyMissionsWidget from "../../components/common/FamilyMissionsWidget.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import NewsSection from "../../components/common/NewsSection.jsx";
import ImageSlot from "../../components/common/ImageSlot.jsx";
import FamilyDashboard from "../family/FamilyDashboard.jsx";
import * as emotionService from "../../services/emotionService.js";
import * as familyService from "../../services/familyService.js";
import "./Dashboard.css";

// Nickname if set, otherwise the first name; Latin names get a space after "คุณ".
function greetingName(user) {
  const name = user.nickname?.trim() || user.name?.trim().split(/\s+/)[0] || "";
  return /^[A-Za-z]/.test(name) ? ` ${name}` : name;
}

const TODAY_LABEL = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" });

function Dashboard() {
  const { user } = useAuth();
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [familyLinks, setFamilyLinks] = useState(null);

  useEffect(() => {
    emotionService
      .getMyStreak()
      .then(setStreak)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    familyService
      .getMyFamilyLinks()
      .then(setFamilyLinks)
      .catch(() => setFamilyLinks([]));
  }, []);

  // A family member accepts an invite through their own regular account, so
  // the same "user" role can view either dashboard depending on whether
  // they're actively linked as someone's family follower. Wait for the check
  // to resolve before rendering either dashboard, to avoid a flash of the
  // wrong one.
  if (familyLinks === null) {
    return <AsyncState />;
  }
  if (familyLinks.length > 0) {
    return <FamilyDashboard links={familyLinks} />;
  }

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  return (
    <div className="dashboard-page">
      <PageHeader
        icon={LayoutDashboard}
        eyebrow="Your growth space"
        actions={<span className="dashboard-date"><CalendarDays size={16} aria-hidden="true" />{TODAY_LABEL.format(new Date())}</span>}
      >
        วันนี้ เติบโตไปอีกนิด
      </PageHeader>

      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-hero-eyebrow">ยินดีที่ได้เจอกันอีกครั้ง</p>
          <h2>สวัสดี คุณ{greetingName(user)}</h2>
          <p>ทุกก้าวมีความหมาย<br />ค่อย ๆ ไปในจังหวะที่เหมาะกับคุณ</p>
          <div className="dashboard-hero-meta">
            <span><Sparkles size={14} aria-hidden="true" />เริ่มจากสิ่งเล็ก ๆ ที่ทำได้วันนี้</span>
            <StatusBadge status={user.verifiedStatus} />
          </div>
        </div>
        <ImageSlot className="dashboard-hero-art" src="/images/illustrations/dashboard-hero.webp" alt="" />
      </section>

      <div className="dashboard-main">
        <div className="dashboard-main-col">
          {!loading && <DailyCheckin loggedToday={streak?.loggedToday} onLogged={setStreak} />}
          <FamilyMissionsWidget />
          <WeeklyCheckInWidget />
        </div>
        <aside className="dashboard-side-col">
          <GrowthCard streak={streak} />
          <Link to="/counselling" className="ui-card ui-card-soft dashboard-talk">
            <span className="dashboard-talk-icon"><MessageCircle size={18} aria-hidden="true" /></span>
            <strong>มีใครสักคนพร้อมรับฟัง</strong>
            <span>คุยกับผู้ให้คำปรึกษาได้ในจังหวะของคุณ</span>
          </Link>
        </aside>
      </div>

      <div className="dashboard-section">
        <h2>ภาพรวมของฉัน</h2>
        <div className="dashboard-grid">
          {streak && <StreakWidget streak={streak} />}
          <ApplicationStatusCard />
          <MyCoursesWidget />
          <CounsellingStatusWidget />
          <CommunityPreviewWidget />
        </div>
      </div>

      <div className="dashboard-news">
        <NewsSection limit={3} title="ข่าวสารและบทความล่าสุด" />
      </div>
    </div>
  );
}

export default Dashboard;
