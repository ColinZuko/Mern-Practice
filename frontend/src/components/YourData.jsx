import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, Trash2 } from "lucide-react";
import { deleteMyAccount, exportMyData } from "../api";
import { useAuth } from "../useAuth";
import { PasswordInput } from "./PasswordInput";
import { authInputClass } from "./Login";

// "Your data" on the account page: download everything, or delete the account (GDPR)
export function YourData() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDownload() {
    setDownloading(true);
    setMessage("");
    try {
      const data = await exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "pickle-and-pan-my-data.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.response?.data?.message || "Couldn't download your data. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete(e) {
    e.preventDefault();
    if (!window.confirm("Delete your account for good? This can't be undone.")) return;
    setDeleting(true);
    setMessage("");
    try {
      await deleteMyAccount(user._id, password);
      logout();
      navigate("/", { replace: true });
      window.alert("Your account has been deleted. Thanks for cooking with us!");
    } catch (error) {
      setMessage(error.response?.data?.message || "Couldn't delete your account. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <section className="pt-12">
      <h2 className="mb-6 border-b pb-3 text-2xl font-semibold sm:text-3xl">Your data</h2>
      <p className="max-w-2xl text-sm text-muted-foreground">
        See what we store and why in our{" "}
        <Link to="/privacy" className="font-medium text-primary hover:underline">privacy policy</Link>.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6">
          <h3 className="font-sans text-base font-semibold">Download your data</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A file with your account details, saved recipes, ratings, comments and published recipes.
          </p>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-60 cursor-pointer"
          >
            <Download className="h-4 w-4" /> {downloading ? "Preparing…" : "Download my data"}
          </button>
        </div>

        <div className="rounded-2xl border border-destructive/30 bg-card p-6">
          <h3 className="font-sans text-base font-semibold text-destructive">Delete your account</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Removes your account, saved recipes, ratings and comments. Recipes you published stay online as
            "Former contributor".
          </p>
          {confirming ? (
            <form onSubmit={handleDelete} className="mt-4 space-y-3">
              <label htmlFor="delete-password" className="block text-sm font-medium">
                Enter your password to confirm
              </label>
              <PasswordInput
                id="delete-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                maxLength={72}
                className={authInputClass}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={deleting || !password}
                  className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-white transition hover:bg-destructive/90 disabled:opacity-60 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Delete my account"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    setPassword("");
                    setMessage("");
                  }}
                  className="rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/5 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" /> Delete account…
            </button>
          )}
        </div>
      </div>
      {message && <p className="mt-4 text-sm font-medium text-destructive">{message}</p>}
    </section>
  );
}
