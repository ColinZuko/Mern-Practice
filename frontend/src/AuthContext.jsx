import { startTransition, useCallback, useEffect, useState } from "react";
import { getMe, logoutRequest, toggleLike as toggleLikeRequest, toggleSaved } from "./api";
import { AuthContext } from "./useAuth";

// Asks the server who is signed in (the session is an httpOnly cookie the page can't read).
// Returns the account, null when nobody is signed in, or undefined if the server couldn't be reached.
async function loadAccount() {
  try {
    return await getMe();
  } catch (error) {
    if (error.response && [401, 403, 404].includes(error.response.status)) return null;
    return undefined;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // False until the server has told us whether there's a session
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Logins used to be kept in sessionStorage; that's no longer used
    try {
      sessionStorage.removeItem("User");
    } catch {
      // storage unavailable
    }

    let cancelled = false;
    loadAccount().then((account) => {
      if (cancelled) return;
      setUser(account ?? null);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Call after the server has set the session cookie (login or sign-up)
  async function login() {
    const account = await loadAccount();
    if (account !== undefined) setUser(account);
    setReady(true);
  }

  // Reload the account from the server, e.g. after the email address is confirmed
  const refresh = useCallback(async () => {
    const account = await loadAccount();
    if (account !== undefined) setUser(account);
  }, []);

  async function logout() {
    // Page changes in React Router are transitions; doing this as one too means a "go home,
    // then log out" happens together, instead of account pages bouncing to sign-in first
    startTransition(() => setUser(null));
    try {
      await logoutRequest();
    } catch {
      // Already signed out on the server (or it's unreachable); the page is signed out either way
    }
  }

  async function toggleSave(postId) {
    const saved = await toggleSaved(postId);
    setUser((current) => ({ ...current, saved }));
  }

  // Returns the post's new like count
  async function toggleLike(postId) {
    const { liked, likes } = await toggleLikeRequest(postId);
    setUser((current) => {
      const others = (current.liked || []).filter((id) => id !== postId);
      return { ...current, liked: liked ? [...others, postId] : others };
    });
    return likes;
  }

  const role = user?.role || "user";
  const value = {
    user,
    ready,
    isLoggedIn: !!user,
    isVerified: !!user && user.emailVerified !== false,
    role,
    canWrite: !!user && (role === "editor" || role === "admin"),
    isAdmin: !!user && role === "admin",
    isSaved: (postId) => !!user?.saved?.includes(postId),
    isLiked: (postId) => !!user?.liked?.includes(postId),
    canManage: (post) =>
      !!user && (role === "admin" || (role === "editor" && post.author === user._id)),
    login,
    logout,
    refresh,
    toggleSave,
    toggleLike,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
