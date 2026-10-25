import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import Sidebar from "./Sidebar.jsx";
import { usesSidebar } from "./navLinks.js";
import { useAuth } from "../../context/AuthContext.jsx";
import AsyncState from "../common/AsyncState.jsx";
import PageBoundary from "../common/PageBoundary.jsx";
import RequestFeedback from "../common/RequestFeedback.jsx";
import "./Layout.css";
export default function Layout() {
  const { pathname } = useLocation();
  const { user, isAuthenticated } = useAuth();
  const sidebar = usesSidebar(user, isAuthenticated);
  return <div className="layout">
    <a className="skip-link" href="#main-content">ข้ามไปยังเนื้อหา</a><Navbar />
    <div className={`layout-body${sidebar ? " has-sidebar" : ""}`}>
      {sidebar && <Sidebar />}
      <main id="main-content" className="layout-content" tabIndex={-1}>
        <PageBoundary key={pathname}><Suspense fallback={<AsyncState />}><Outlet /></Suspense></PageBoundary>
      </main>
    </div>
    <Footer /><RequestFeedback />
  </div>;
}
