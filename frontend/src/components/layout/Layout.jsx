import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import AsyncState from "../common/AsyncState.jsx";
import PageBoundary from "../common/PageBoundary.jsx";
import RequestFeedback from "../common/RequestFeedback.jsx";
import "./Layout.css";
export default function Layout() {
  const { pathname } = useLocation();
  return <div className="layout">
    <a className="skip-link" href="#main-content">ข้ามไปยังเนื้อหา</a><Navbar />
      <main id="main-content" className="layout-content" tabIndex={-1}>
        <PageBoundary key={pathname}><Suspense fallback={<AsyncState />}><Outlet /></Suspense></PageBoundary>
      </main>
    <Footer /><RequestFeedback />
  </div>;
}
