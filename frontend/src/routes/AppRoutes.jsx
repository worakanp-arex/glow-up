import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "../components/layout/Layout.jsx";
import AsyncState from "../components/common/AsyncState.jsx";
import PageHeader from "../components/common/PageHeader.jsx";
import { SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute.jsx";
const Home = lazy(() => import("../pages/Home.jsx"));
const About = lazy(() => import("../pages/About.jsx"));
const Profile = lazy(() => import("../pages/Profile.jsx"));
const Login = lazy(() => import("../pages/auth/Login.jsx"));
const Register = lazy(() => import("../pages/auth/Register.jsx"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword.jsx"));
const UserDashboard = lazy(() => import("../pages/user/Dashboard.jsx"));
const JobSearch = lazy(() => import("../pages/user/JobSearch.jsx"));
const JobDetail = lazy(() => import("../pages/user/JobDetail.jsx"));
const MyApplications = lazy(() => import("../pages/user/MyApplications.jsx"));
const CravingTracker = lazy(() => import("../pages/user/CravingTracker.jsx"));
const Streak = lazy(() => import("../pages/user/Streak.jsx"));
const WeeklyCheckIn = lazy(() => import("../pages/user/WeeklyCheckIn.jsx"));
const MicroLessons = lazy(() => import("../pages/user/MicroLessons.jsx"));
const LessonDetail = lazy(() => import("../pages/user/LessonDetail.jsx"));
const ScenarioPlayer = lazy(() => import("../pages/user/ScenarioPlayer.jsx"));
const LessonManagement = lazy(() => import("../pages/counsellor/LessonManagement.jsx"));
const Community = lazy(() => import("../pages/user/Community.jsx"));
const MyPosts = lazy(() => import("../pages/user/MyPosts.jsx"));
const SavedPosts = lazy(() => import("../pages/user/SavedPosts.jsx"));
const PostDetail = lazy(() => import("../pages/user/PostDetail.jsx"));
const StaffProfile = lazy(() => import("../pages/user/StaffProfile.jsx"));
const Courses = lazy(() => import("../pages/user/Courses.jsx"));
const CourseDetail = lazy(() => import("../pages/user/CourseDetail.jsx"));
const Counselling = lazy(() => import("../pages/user/Counselling.jsx"));
const CounsellingDetail = lazy(() => import("../pages/counselling/CounsellingDetail.jsx"));
const CounsellorQueue = lazy(() => import("../pages/counsellor/Queue.jsx"));
const PatientProfile = lazy(() => import("../pages/counsellor/PatientProfile.jsx"));
const CourseManagement = lazy(() => import("../pages/counsellor/CourseManagement.jsx"));
const Analytics = lazy(() => import("../pages/counsellor/Analytics.jsx"));
const EmployerDashboard = lazy(() => import("../pages/employer/Dashboard.jsx"));
const PostJob = lazy(() => import("../pages/employer/PostJob.jsx"));
const MyJobs = lazy(() => import("../pages/employer/MyJobs.jsx"));
const Applicants = lazy(() => import("../pages/employer/Applicants.jsx"));
const ApplicantDetail = lazy(() => import("../pages/employer/ApplicantDetail.jsx"));
const AdminDashboard = lazy(() => import("../pages/admin/Dashboard.jsx"));
const AdminUsers = lazy(() => import("../pages/admin/Users.jsx"));
const JobsModeration = lazy(() => import("../pages/admin/JobsModeration.jsx"));
const PostsModeration = lazy(() => import("../pages/admin/PostsModeration.jsx"));
const JobCategories = lazy(() => import("../pages/admin/JobCategories.jsx"));
const Assessments = lazy(() => import("../pages/admin/Assessments.jsx"));
const UserEmotionHistory = lazy(() => import("../pages/admin/UserEmotionHistory.jsx"));
const FamilyHome = lazy(() => import("../pages/family/FamilyHome.jsx"));
const FamilyAcceptInvite = lazy(() => import("../pages/family/FamilyAcceptInvite.jsx"));

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="family/accept" element={<FamilyAcceptInvite />} />

        <Route path="jobs" element={<JobSearch />} />
        <Route path="jobs/:id" element={<JobDetail />} />

        <Route element={<ProtectedRoute roles={["family", "user"]} />}>
          <Route path="family/dashboard" element={<FamilyHome />} />
        </Route>

        <Route element={<ProtectedRoute roles={["user"]} />}>
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="my-applications" element={<MyApplications />} />
          <Route path="craving-tracker" element={<CravingTracker />} />
          <Route path="streak" element={<Streak />} />
          <Route path="weekly-checkin" element={<WeeklyCheckIn />} />
          <Route path="learning" element={<MicroLessons />} />
          <Route path="learning/:id" element={<LessonDetail />} />
          <Route path="learning/scenarios/:id" element={<ScenarioPlayer />} />
          <Route path="counselling" element={<Counselling />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<Profile />} />
          <Route path="community" element={<Community />} />
          <Route path="community/saved" element={<SavedPosts />} />
          <Route path="community/:id" element={<PostDetail />} />
          <Route path="community/staff/:id" element={<StaffProfile />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:id" element={<CourseDetail />} />
        </Route>

        <Route element={<ProtectedRoute roles={["user", "counsellor", "admin"]} />}>
          <Route path="counselling/:id" element={<CounsellingDetail />} />
        </Route>

        <Route element={<ProtectedRoute roles={["counsellor", "admin"]} />}>
          <Route path="counsellor" element={<CounsellorQueue />} />
          <Route path="counsellor/requests/:id" element={<CounsellingDetail />} />
          <Route path="counsellor/patients/:userId" element={<PatientProfile />} />
          <Route path="community/mine" element={<MyPosts />} />
          <Route path="counsellor/courses" element={<CourseManagement />} />
          <Route path="counsellor/lessons" element={<LessonManagement />} />
          <Route path="counsellor/analytics" element={<Analytics />} />
          <Route path="admin/posts-moderation" element={<PostsModeration />} />
        </Route>

        <Route element={<ProtectedRoute roles={["employer"]} />}>
          <Route path="employer/dashboard" element={<EmployerDashboard />} />
          <Route path="employer/jobs" element={<MyJobs />} />
          <Route path="employer/jobs/new" element={<PostJob />} />
          <Route path="employer/jobs/:jobId/applicants" element={<Applicants />} />
          <Route path="employer/applications/:id" element={<ApplicantDetail />} />
        </Route>

        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/users/:userId/emotion" element={<UserEmotionHistory />} />
          <Route path="admin/jobs" element={<JobsModeration />} />
          <Route path="admin/job-categories" element={<JobCategories />} />
          <Route path="admin/assessments" element={<Assessments />} />
        </Route>
        <Route path="*" element={<div className="not-found-page"><PageHeader icon={SearchX} backTo="/" backLabel="หน้าหลัก">ไม่พบหน้าที่คุณต้องการ</PageHeader><AsyncState empty title="404" description="ลิงก์อาจเปลี่ยนไป กลับไปเริ่มต้นอีกครั้งได้เลย"><Link to="/" className="btn btn-primary">กลับหน้าหลัก</Link></AsyncState></div>} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
