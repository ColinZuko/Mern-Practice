import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "User";

// Returns the stored token, or null if there is none or it has expired
export function getToken() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  try {
    const { exp } = jwtDecode(token);
    if (exp && exp * 1000 < Date.now()) {
      sessionStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  } catch {
    sessionStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export function getCurrentUser() {
  const token = getToken();
  return token ? jwtDecode(token) : null;
}

export function isLoggedIn() {
  return getToken() !== null;
}

export function saveToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
}
