import { useState } from "react";
import { MailWarning } from "lucide-react";
import { resendVerification } from "../api";
import { useAuth } from "../useAuth";

// Reminder for signed-in people who haven't confirmed their email yet
export function VerifyBanner() {
  const { user, isLoggedIn, isVerified } = useAuth();
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  if (!isLoggedIn || isVerified) return null;

  async function handleResend() {
    setSending(true);
    try {
      await resendVerification();
      setStatus("Sent! Check your inbox (and spam folder).");
    } catch (error) {
      setStatus(error.response?.data?.message || "Couldn't send the email. Please try again later.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-b border-warning-border bg-warning text-warning-foreground print:hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:px-6">
        <p className="flex flex-1 items-start gap-2">
          <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Please confirm your email address. We sent a link to <strong>{user.email}</strong>. You can
            save recipes once it's confirmed.
          </span>
        </p>
        {status ? (
          <p className="font-medium">{status}</p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="self-start min-h-11 rounded-full border border-warning-border bg-card px-4 font-medium text-foreground transition hover:bg-muted disabled:opacity-60 sm:self-auto cursor-pointer"
          >
            {sending ? "Sending…" : "Resend email"}
          </button>
        )}
      </div>
    </div>
  );
}
