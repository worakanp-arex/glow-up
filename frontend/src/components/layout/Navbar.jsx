import { Link } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import NotificationBell from "./NotificationBell.jsx";
import SecondaryNav from "./SecondaryNav.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import UserMenu from "./UserMenu.jsx";
import "./Navbar.css";

function Navbar() {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();

  return (
    <div className="navbar-wrapper">
      <header className="navbar">
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
    </div>
  );
}

export default Navbar;
