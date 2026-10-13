import { Navigate } from "react-router-dom";
import { isLoggedIn } from "../auth";

// Wraps pages that only logged-in users may see; guests are sent to the login page
export function RequireAuth({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
