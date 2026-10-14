import { verifyUser } from "../api";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth";
import { PasswordInput } from "./PasswordInput";

export const authLabelClass = "block text-sm font-medium";
export const authInputClass =
  "mt-1.5 h-11 w-full rounded-xl border bg-card px-4 outline-none transition focus:ring-2 focus:ring-ring/30";
export const authButtonClass =
  "h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 cursor-pointer";

export function Login() {
  const [user, setUser] = useState({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setUser({ ...user, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    const { success, error } = await verifyUser(user);
    setIsSubmitting(false);

    if (success) {
      await login();
      navigate("/");
    } else {
      setErrorMessage(error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="login-email" className={authLabelClass}>Email</label>
        <input
          id="login-email"
          type="email"
          onChange={handleChange}
          name="email"
          autoComplete="email"
          required
          maxLength={50}
          className={authInputClass}
        />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="login-password" className={authLabelClass}>Password</label>
          <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="login-password"
          onChange={handleChange}
          name="password"
          autoComplete="current-password"
          required
          maxLength={72}
          className={authInputClass}
        />
      </div>
      {errorMessage && (
        <p className="text-sm font-medium text-destructive">{errorMessage}</p>
      )}
      <button type="submit" disabled={isSubmitting} className={authButtonClass}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
