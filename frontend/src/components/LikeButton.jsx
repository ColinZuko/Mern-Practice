import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth";
import { BreadIcon } from "./BreadIcon";

// "Give it a slice": the like button, styled as bread
export function LikeButton({ postId, initialCount = 0 }) {
  const { isLoggedIn, isVerified, isLiked, toggleLike } = useAuth();
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();
  const liked = isLiked(postId);

  async function handleClick() {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!isVerified) {
      setNotice("Confirm your email address to like recipes. Check your inbox for the link.");
      return;
    }
    setBusy(true);
    try {
      setCount(await toggleLike(postId));
    } catch (error) {
      console.error("Failed to like recipe:", error);
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
        aria-pressed={liked}
        title={liked ? "Take your slice back" : "Give this recipe a slice"}
        className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition cursor-pointer disabled:opacity-60 ${
          liked ? "border-[#c98b45] bg-[#fbefd9] text-[#6b4319]" : "hover:bg-muted"
        }`}
      >
        <BreadIcon
          filled={liked}
          className={`h-5 w-5 transition-transform duration-200 ${liked ? "scale-110" : "group-hover:-rotate-12"}`}
        />
        <span>{count}</span>
        <span className="sr-only">{count === 1 ? "like" : "likes"}</span>
      </button>
      {notice && <p className="basis-full text-sm text-muted-foreground">{notice}</p>}
    </>
  );
}
