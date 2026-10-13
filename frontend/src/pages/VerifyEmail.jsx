import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleCheck, CircleX } from "lucide-react";
import { resendVerification, verifyEmail } from "../api";
import { useAuth } from "../useAuth";

// Opened from the link in the verification email
export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { isLoggedIn, isVerified, user, refresh } = useAuth();
  const [result, setResult] = useState({ state: "checking" });
  const [resendStatus, setResendStatus] = useState("");
  // Each link works once, so make sure we only send it once (React may run effects twice in development)
  const sentFor = useRef(null);

  useEffect(() => {
    if (sentFor.current === token) return;
    sentFor.current = token;

    verifyEmail(token)
      .then((data) => {
        setResult({ state: "done", email: data.email });
        refresh();
      })
      .catch((error) => {
        setResult({
          state: "failed",
          message: error.response?.data?.message || "Something went wrong. Please try again later.",
        });
      });
  }, [token, refresh]);

  async function handleResend() {
    try {
      await resendVerification();
      setResendStatus("A new link is on its way. Check your inbox.");
    } catch (error) {
      setResendStatus(error.response?.data?.message || "Couldn't send the email. Please try again later.");
    }
  }

  // Opening an old link again after confirming isn't an error worth showing
  const alreadyConfirmed = result.state === "failed" && isVerified;
  const shown = alreadyConfirmed ? { state: "done", email: user.email } : result;

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      {shown.state === "checking" && <p className="text-muted-foreground">Confirming your email…</p>}

      {shown.state === "done" && (
        <>
          <CircleCheck className="mx-auto h-14 w-14 text-primary" />
          <h1 className="mt-6 text-3xl font-semibold">Email confirmed</h1>
          <p className="mt-3 text-muted-foreground">
            Thanks! <strong>{shown.email}</strong> is confirmed, so you can now save your favourite recipes.
          </p>
          <Link
            to={isLoggedIn ? "/home" : "/login"}
            className="mt-8 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {isLoggedIn ? "Start exploring" : "Sign in"}
          </Link>
        </>
      )}

      {shown.state === "failed" && (
        <>
          <CircleX className="mx-auto h-14 w-14 text-destructive" />
          <h1 className="mt-6 text-3xl font-semibold">Couldn't confirm your email</h1>
          <p className="mt-3 text-muted-foreground">{shown.message}</p>
          {isLoggedIn ? (
            resendStatus ? (
              <p className="mt-6 font-medium">{resendStatus}</p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="mt-8 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                Send me a new link
              </button>
            )
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link> to get a
              new link.
            </p>
          )}
        </>
      )}
    </div>
  );
}
