import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Award, CalendarCheck, Lightbulb, LayoutDashboard, BookOpen, HeartHandshake, Search, User, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import DailyCheckin from "../../components/user/DailyCheckin.jsx";
import StreakWidget from "../../components/user/StreakWidget.jsx";
import WeeklyCheckInWidget from "../../components/user/WeeklyCheckInWidget.jsx";
import ApplicationStatusCard from "../../components/user/ApplicationStatusCard.jsx";
import MyCoursesWidget from "../../components/user/MyCoursesWidget.jsx";
import CounsellingStatusWidget from "../../components/user/CounsellingStatusWidget.jsx";
import CommunityPreviewWidget from "../../components/user/CommunityPreviewWidget.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import NewsSection from "../../components/common/NewsSection.jsx";
import FamilyDashboard from "../family/FamilyDashboard.jsx";
import * as emotionService from "../../services/emotionService.js";
import * as familyService from "../../services/familyService.js";
import "./Dashboard.css";

const OVERVIEW_LINKS = [
  { to: "/jobs", label: "ค้นหางาน", detail: "ค้นหาโอกาสงานที่เหมาะกับคุณ", icon: Search },
  { to: "/craving-tracker", label: "บันทึกอารมณ์", detail: "บันทึกความรู้สึกและความอยาก", icon: Activity },
  { to: "/weekly-checkin", label: "เช็คอินรายสัปดาห์", detail: "ทบทวนการดูแลตัวเองในสัปดาห์นี้", icon: CalendarCheck },
  { to: "/learning", label: "ฝึกทักษะชีวิต", detail: "บทเรียนสั้นและสถานการณ์ฝึกฝน", icon: Lightbulb },
  { to: "/streak", label: "ภารกิจและคะแนน", detail: "ดูคะแนนสะสมและรางวัลของฉัน", icon: Award },
  { to: "/profile", label: "โปรไฟล์ของฉัน", detail: "จัดการทักษะและเอกสารสมัครงาน", icon: User },
];

const QUICK_LINKS = [
  { to: "/jobs", label: "ค้นหางาน", icon: Search },
  { to: "/community", label: "ชุมชนฟื้นฟู", icon: Users },
  { to: "/courses", label: "ศูนย์การเรียนรู้", icon: BookOpen },
  { to: "/counselling", label: "การให้คำปรึกษา", icon: HeartHandshake },
  { to: "/profile", label: "โปรไฟล์ของฉัน", icon: User },
];

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
      <div className="dashboard-greeting">
        <PageHeader icon={LayoutDashboard} description="ทุกก้าวเล็ก ๆ มีความหมาย วันนี้มาดูแลตัวเองไปด้วยกัน">สวัสดี, {user.name}</PageHeader>
        <StatusBadge status={user.verifiedStatus} />
      </div>

      <WeeklyCheckInWidget />

      {!loading && (
        <DailyCheckin loggedToday={streak?.loggedToday} onLogged={setStreak} />
      )}

      <div className="dashboard-section">
        <h2>ภาพรวมของฉัน</h2>
        <div className="dashboard-grid">
          {streak && <StreakWidget streak={streak} />}
          <ApplicationStatusCard />
          <MyCoursesWidget />
          <CounsellingStatusWidget />
          <CommunityPreviewWidget />
          {OVERVIEW_LINKS.map(({ to, label, detail, icon: Icon }) => <Link key={to} to={to} className="overview-action-card"><span className="overview-action-icon"><Icon size={20} /></span><div><h2>{label}</h2><p>{detail}</p></div></Link>)}
        </div>
      </div>

      <div className="dashboard-quicklinks">
        <h2>ทางลัด</h2>
        <div className="dashboard-links">
          {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}>
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="dashboard-news">
        <NewsSection />
      </div>
    </div>
  );
}

export default Dashboard;
