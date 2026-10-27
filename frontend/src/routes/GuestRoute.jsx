import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { roleHome } from "../constants/roleHome.js";
import { inviteReturnTo } from "../utils/authNavigation.js";

// Pages for people who are not signed in (login, register). Someone who already
// is signed in is sent on instead of seeing a form that would silently swap
// the account behind their open notifications.
function GuestRoute() {
  const { user, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();

  if (!isAuthenticated) return <Outlet />;
  const returnTo = ["family", "user"].includes(user.role) ? inviteReturnTo(searchParams) : null;
  return <Navigate to={returnTo || roleHome(user.role)} replace />;
}

export default GuestRoute;
