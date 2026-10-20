import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useAuth } from "../useAuth";

// Lets readers keep a recipe in their saved list; guests are asked to sign in
export function SaveButton({ postId }) {
  const { isLoggedIn, isVerified, isSaved, toggleSave } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();
  const saved = isSaved(postId);

  async function handleClick() {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!isVerified) {
      setNotice("Confirm your email address to save recipes. Check your inbox for the link.");
      return;
    }
    setBusy(true);
    try {
      await toggleSave(postId);
    } catch (error) {
      console.error("Failed to save recipe:", error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition cursor-pointer disabled:opacity-60 ${
        saved
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "hover:bg-muted"
      }`}
    >
      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {saved ? "Saved" : "Save recipe"}
    </button>
    {notice && <p className="basis-full text-sm text-muted-foreground">{notice}</p>}
    </>
  );
}
