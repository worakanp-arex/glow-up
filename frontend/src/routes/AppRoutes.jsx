import { Routes, Route } from "react-router-dom";
import Layout from "../components/layout/Layout.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import Home from "../pages/Home.jsx";
import About from "../pages/About.jsx";
import Profile from "../pages/Profile.jsx";
import Login from "../pages/auth/Login.jsx";
import Register from "../pages/auth/Register.jsx";
import ForgotPassword from "../pages/auth/ForgotPassword.jsx";
import ResetPassword from "../pages/auth/ResetPassword.jsx";
import UserDashboard from "../pages/user/Dashboard.jsx";
import JobSearch from "../pages/user/JobSearch.jsx";
import JobDetail from "../pages/user/JobDetail.jsx";
import MyApplications from "../pages/user/MyApplications.jsx";
import CravingTracker from "../pages/user/CravingTracker.jsx";
import Streak from "../pages/user/Streak.jsx";
import Community from "../pages/user/Community.jsx";
import MyPosts from "../pages/user/MyPosts.jsx";
import PostDetail from "../pages/user/PostDetail.jsx";
import Courses from "../pages/user/Courses.jsx";
import CourseDetail from "../pages/user/CourseDetail.jsx";
import Counselling from "../pages/user/Counselling.jsx";
import EmployerDashboard from "../pages/employer/Dashboard.jsx";
import PostJob from "../pages/employer/PostJob.jsx";
import MyJobs from "../pages/employer/MyJobs.jsx";
import Applicants from "../pages/employer/Applicants.jsx";
import ApplicantDetail from "../pages/employer/ApplicantDetail.jsx";
import AdminDashboard from "../pages/admin/Dashboard.jsx";
import AdminUsers from "../pages/admin/Users.jsx";
import JobsModeration from "../pages/admin/JobsModeration.jsx";
import JobCategories from "../pages/admin/JobCategories.jsx";
import Assessments from "../pages/admin/Assessments.jsx";
import UserEmotionHistory from "../pages/admin/UserEmotionHistory.jsx";

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

        <Route path="jobs" element={<JobSearch />} />
        <Route path="jobs/:id" element={<JobDetail />} />

        <Route element={<ProtectedRoute roles={["user"]} />}>
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="my-applications" element={<MyApplications />} />
          <Route path="craving-tracker" element={<CravingTracker />} />
          <Route path="streak" element={<Streak />} />
          <Route path="counselling" element={<Counselling />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<Profile />} />
          <Route path="community" element={<Community />} />
          <Route path="community/mine" element={<MyPosts />} />
          <Route path="community/:id" element={<PostDetail />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:id" element={<CourseDetail />} />
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
      </Route>
    </Routes>
  );
}

export default AppRoutes;
