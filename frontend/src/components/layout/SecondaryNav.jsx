import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getNavLinks } from "./navLinks.js";
import "./SecondaryNav.css";

function SecondaryNav() {
  const { user, isAuthenticated } = useAuth();
  const links = getNavLinks(user, isAuthenticated);

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
