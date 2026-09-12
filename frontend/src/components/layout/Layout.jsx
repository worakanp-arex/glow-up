import { Suspense } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import Sidebar from "./Sidebar.jsx";
import AsyncState from "../common/AsyncState.jsx";
import PageBoundary from "../common/PageBoundary.jsx";
import RequestFeedback from "../common/RequestFeedback.jsx";
import "./Layout.css";
export default function Layout() {
  const { isAuthenticated, user } = useAuth();
  const { pathname } = useLocation();
  const workspace = isAuthenticated && !["/", "/about", "/login", "/register", "/forgot-password", "/reset-password"].includes(pathname);
  const home = { user: "/dashboard", employer: "/employer/dashboard", admin: "/admin", counsellor: "/counsellor" }[user?.role] || "/";
  return <div className={`layout${workspace ? " has-workspace" : ""}`}>
    <a className="skip-link" href="#main-content">ข้ามไปยังเนื้อหา</a><Navbar />
    <div className={workspace ? "workspace-frame" : "public-frame"}>{workspace && <Sidebar />}
      <main id="main-content" className="layout-content" tabIndex={-1}>
        {workspace && <div className="workspace-breadcrumb"><Link to={home}><Home size={14} /> พื้นที่ของฉัน</Link><ChevronRight size={13} /><span>glow-up</span></div>}
        <PageBoundary key={pathname}><Suspense fallback={<AsyncState />}><Outlet /></Suspense></PageBoundary>
      </main>
    </div>{!workspace && <Footer />}<RequestFeedback />
  </div>;
}
