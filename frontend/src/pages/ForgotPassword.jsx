import { useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { requestPasswordReset } from "../api";
import { authButtonClass, authInputClass, authLabelClass } from "../components/Login";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await requestPasswordReset(email);
      setSentTo(email);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again later.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      {sentTo ? (
        <div className="text-center">
          <MailCheck className="mx-auto h-14 w-14 text-primary" />
          <h1 className="mt-6 text-3xl font-semibold">Check your inbox</h1>
          <p className="mt-3 text-muted-foreground">
            If there's an account for <strong>{sentTo}</strong>, we've sent a link to choose a new password.
            It works for 1 hour. Don't forget to look in your spam folder.
          </p>
          <Link to="/login" className="mt-8 inline-block text-sm font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-semibold">Forgot your password?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the email address you signed up with and we'll send you a link to choose a new one.
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="forgot-email" className={authLabelClass}>Email</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                maxLength={100}
                className={authInputClass}
              />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <button type="submit" disabled={sending} className={authButtonClass}>
              {sending ? "Sending…" : "Send reset link"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </>
      )}
    </div>
  );
}
