import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getNavLinks } from "./navLinks.js";
import "./SecondaryNav.css";

function SecondaryNav() {
  const { user, isAuthenticated } = useAuth();
  const mobileExtras = ["/my-applications", "/weekly-checkin", "/learning", "/streak"];
  const links = getNavLinks(user, isAuthenticated).filter(({ to }) => !mobileExtras.includes(to));

  return (
    <nav className="secondary-nav">
      <div className="secondary-nav-inner">
        {links.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `secondary-nav-link${isActive ? " active" : ""}`}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default SecondaryNav;
