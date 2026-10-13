import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, getToken, logout as clearToken, saveToken } from "./auth";
import { getMe, toggleSaved } from "./api";
import { AuthContext } from "./useAuth";

// Fetches the account (current role, saved recipes) from the server.
// Returns the account, null if the token was rejected, or undefined if the server couldn't be reached.
async function loadAccount() {
  try {
    return await getMe();
  } catch (error) {
    if (error.response && [401, 403, 404].includes(error.response.status)) {
      clearToken();
      return null;
    }
    return undefined;
  }
}

export function AuthProvider({ children }) {
  // Start from the token so the UI is right immediately, then confirm with the server
  const [user, setUser] = useState(() => getCurrentUser());
  // False until the server has confirmed the account's current role
  const [ready, setReady] = useState(() => !getToken());

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    loadAccount().then((account) => {
      if (cancelled) return;
      if (account !== undefined) setUser(account);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(token) {
    saveToken(token);
    setUser(getCurrentUser());
    const account = await loadAccount();
    if (account !== undefined) setUser(account);
    setReady(true);
  }

  // Reload the account from the server, e.g. after the email address is confirmed
  const refresh = useCallback(async () => {
    const account = await loadAccount();
    if (account !== undefined) setUser(account);
  }, []);

  function logout() {
    clearToken();
    setUser(null);
  }

  async function toggleSave(postId) {
    const saved = await toggleSaved(postId);
    setUser((current) => ({ ...current, saved }));
  }

  const role = user?.role || "user";
  const value = {
    user,
    ready,
    isLoggedIn: !!user,
    // Until the server answers, assume verified so the reminder banner doesn't flash
    isVerified: !!user && user.emailVerified !== false,
    role,
    canWrite: !!user && (role === "editor" || role === "admin"),
    isAdmin: !!user && role === "admin",
    isSaved: (postId) => !!user?.saved?.includes(postId),
    canManage: (post) =>
      !!user && (role === "admin" || (role === "editor" && post.author === user._id)),
    login,
    logout,
    refresh,
    toggleSave,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
