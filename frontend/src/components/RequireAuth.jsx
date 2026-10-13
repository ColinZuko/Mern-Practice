import { Navigate } from "react-router-dom";
import { useAuth } from "../useAuth";

// Wraps pages that need an account; pass `roles` to also limit by role.
// Guests are sent to the login page, logged-in users without the role go home.
export function RequireAuth({ children, roles }) {
  const { isLoggedIn, role, ready } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !ready) {
    return <p className="py-32 text-center text-muted-foreground">Loading…</p>;
  }
  if (roles && !roles.includes(role)) {
    return <Navigate to="/home" replace />;
  }
  return children;
}
