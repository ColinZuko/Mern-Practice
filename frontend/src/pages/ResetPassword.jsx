import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleCheck } from "lucide-react";
import { resetPassword } from "../api";
import { useAuth } from "../useAuth";
import { authButtonClass, authInputClass, authLabelClass } from "../components/Login";

// Opened from the link in the password reset email
export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState({ message: "", expired: false });
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError({ message: "The two passwords don't match.", expired: false });
      return;
    }
    setSaving(true);
    setError({ message: "", expired: false });
    try {
      await resetPassword(token, password);
      // Any session in this browser is from before the reset and no longer works
      logout();
      setDone(true);
    } catch (err) {
      setError({
        message: err.response?.data?.message || "Something went wrong. Please try again later.",
        expired: !!err.response?.data?.expired || err.response?.status === 400,
      });
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 text-center">
        <CircleCheck className="mx-auto h-14 w-14 text-primary" />
        <h1 className="mt-6 text-3xl font-semibold">Password changed</h1>
        <p className="mt-3 text-muted-foreground">
          You can now sign in with your new password. For your safety, you've been signed out everywhere else.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <h1 className="text-3xl font-semibold">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        At least 6 characters, with an uppercase letter, a number and a symbol.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="new-password" className={authLabelClass}>New password</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
            maxLength={72}
            pattern="(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).*"
            title="Password must contain at least one uppercase letter, one number, and one symbol."
            className={authInputClass}
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className={authLabelClass}>Repeat new password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            maxLength={72}
            className={authInputClass}
          />
        </div>
        {error.message && (
          <p className="text-sm font-medium text-destructive">
            {error.message}{" "}
            {error.expired && (
              <Link to="/forgot-password" className="underline">Get a new link</Link>
            )}
          </p>
        )}
        <button type="submit" disabled={saving || !token} className={authButtonClass}>
          {saving ? "Saving…" : "Save new password"}
        </button>
        {!token && (
          <p className="text-sm text-muted-foreground">
            This page needs the link from your email.{" "}
            <Link to="/forgot-password" className="font-medium text-primary hover:underline">Ask for a link</Link>
          </p>
        )}
      </form>
    </div>
  );
}
