import { Navigate } from "react-router-dom";
import { useAuth } from "../useAuth";

// Wraps pages that need an account; pass `roles` to also limit by role.
// Guests are sent to the login page, logged-in users without the role go home.
export function RequireAuth({ children, roles }) {
  const { isLoggedIn, role, ready } = useAuth();

  // Until the server has answered we don't know yet whether someone is signed in
  if (!ready) {
    return <p className="py-32 text-center text-muted-foreground">Loading…</p>;
  }
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
