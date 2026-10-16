import { useState } from "react";
import { Mail } from "lucide-react";
import { updateEmailPreferences } from "../api";
import { useAuth } from "../useAuth";

// Account setting: get an email when a new recipe is published
export function EmailPreferences() {
  const { user, isVerified, refresh } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const enabled = user?.notifyNewRecipes === true;

  async function handleToggle() {
    setSaving(true);
    setMessage("");
    try {
      await updateEmailPreferences({ notifyNewRecipes: !enabled });
      await refresh();
      setMessage(!enabled ? "You'll get an email when a new recipe is published." : "You won't get new-recipe emails any more.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="pt-12">
      <h2 className="mb-6 border-b pb-3 text-2xl font-semibold sm:text-3xl">Email preferences</h2>
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center">
        <Mail className="h-6 w-6 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="font-medium">New recipes</p>
          <p className="text-sm text-muted-foreground">
            Get an email with the photo and a taste of each new recipe. You can unsubscribe from any email.
          </p>
          {!isVerified && enabled && (
            <p className="mt-1 text-sm text-amber-700">Confirm your email address first, then these emails will start.</p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Email me about new recipes"
          onClick={handleToggle}
          disabled={saving}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-60 cursor-pointer ${
            enabled ? "bg-primary" : "bg-muted-foreground/30"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}
