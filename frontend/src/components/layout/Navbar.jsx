import { useEffect, useState } from "react";
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
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link to="/" className="navbar-brand">
          <img className="navbar-logo" src={theme === "dark" ? "/logoW.png" : "/logo.png"} alt="โลโก้" />
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
          <nav className="navbar-mobile-panel">
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
