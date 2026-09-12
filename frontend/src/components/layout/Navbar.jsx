import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogIn, Menu, UserPlus, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { getNavLinks } from "./navLinks.js";
import NotificationBell from "./NotificationBell.jsx";
import SecondaryNav from "./SecondaryNav.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import UserMenu from "./UserMenu.jsx";
import "./Navbar.css";

function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector("button")?.focus();
    function handleKey(event) {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key !== "Tab") return;
      const items = panelRef.current?.querySelectorAll("a, button");
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", handleKey); previous?.focus(); };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const mobileLinks = getNavLinks(user, isAuthenticated);

  return (
    <div className="navbar-wrapper">
      <header className="navbar">
        <button
          type="button"
          className="navbar-menu-toggle"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link to="/" className="navbar-brand">
          <img className="navbar-logo" src={theme === "dark" ? "/logoW.png" : "/logo.png"} alt="glow-up" />
          <small>เริ่มต้นใหม่ ไปด้วยกัน</small>
        </Link>

        <nav className="navbar-links">
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">
                <LogIn size={18} />
                <span>เข้าสู่ระบบ</span>
              </Link>
              <Link to="/register" className="navbar-link navbar-link-primary">
                <UserPlus size={18} />
                <span>สมัครสมาชิก</span>
              </Link>
            </>
          )}
        </nav>
      </header>

      <SecondaryNav />

      {menuOpen && (
        <>
          <button
            type="button"
            className="navbar-mobile-backdrop"
            aria-label="ปิดเมนู"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="navbar-mobile-panel" id="mobile-navigation" ref={panelRef} aria-label="เมนูหลักบนมือถือ">
            <div className="mobile-menu-heading"><strong>เมนูของคุณ</strong><button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="ปิดเมนู"><X size={20} /></button></div>
            {mobileLinks.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `navbar-mobile-link${isActive ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

export default Navbar;
