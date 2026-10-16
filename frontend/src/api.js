import axios from "axios";

const URL = import.meta.env.VITE_API_URL || "";
export const API_URL = URL;

// The login session is an httpOnly cookie set by the API: send it with every request.
// The X-Requested-With header proves a request comes from this site (protection against
// other websites making changes with your cookie).
axios.defaults.withCredentials = true;
axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

// Direct link to a post's image; the browser loads and caches it like any normal image
export function imageUrl(imageId) {
  if (!imageId) return null;
  return `${URL}/images/${encodeURIComponent(imageId)}/raw`;
}

// ---- Posts ----

export async function getTrendingPosts() {
  const response = await axios.get(`${URL}/posts/trending`);
  return response.data || [];
}

export async function getPosts({ search = "", cuisine = "", author = "" } = {}) {
  const params = {};
  if (search) params.search = search;
  if (cuisine) params.cuisine = cuisine;
  if (author) params.author = author;

  const response = await axios.get(`${URL}/posts`, { params });
  return response.data || [];
}

export async function getPost(id) {
  const response = await axios.get(`${URL}/posts/${id}`);
  return response.data;
}

export async function logView(id) {
  try {
    await axios.patch(`${URL}/posts/${id}/view`);
  } catch (error) {
    console.error("Failed to record view:", error);
  }
}

// Returns { liked, likes }
export async function toggleLike(postId) {
  const response = await axios.post(`${URL}/posts/${postId}/like`);
  return response.data;
}

// ---- Comments ----

export async function getComments(postId) {
  const response = await axios.get(`${URL}/posts/${postId}/comments`);
  return response.data;
}

export async function addComment(postId, text) {
  const response = await axios.post(`${URL}/posts/${postId}/comments`, { text });
  return response.data;
}

export async function deleteComment(commentId) {
  const response = await axios.delete(`${URL}/comments/${commentId}`);
  return response.data;
}

export async function createPost(post) {
  const imageId = await uploadImage(post.file);
  const response = await axios.post(`${URL}/posts`, {
    title: post.title,
    description: post.description,
    content: post.content,
    cuisines: post.cuisines,
    recipe: post.recipe,
    imageId,
    // false = don't email subscribers about this recipe
    notify: post.notify !== false,
  });
  return response;
}

export async function updatePost(id, post) {
  const changes = {
    title: post.title,
    description: post.description,
    content: post.content,
    cuisines: post.cuisines,
    recipe: post.recipe,
  };
  // Only upload when the editor picked a new cover image
  if (post.file) changes.imageId = await uploadImage(post.file);

  const response = await axios.put(`${URL}/posts/${id}`, changes);
  return response;
}

export async function deletePost(id) {
  const response = await axios.delete(`${URL}/posts/${id}`);
  return response;
}

// ---- Images ----

// Uploads the file and returns the key the server stored it under
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);
  const response = await axios.post(`${URL}/images`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data.key;
}

// ---- Users ----

export async function getAuthor(id) {
  const response = await axios.get(`${URL}/users/${id}`);
  return response.data;
}

export async function getMe() {
  const response = await axios.get(`${URL}/users/me`);
  return response.data;
}

export async function toggleSaved(postId) {
  const response = await axios.post(`${URL}/users/me/saved/${postId}`);
  return response.data.saved;
}

export async function updateEmailPreferences(preferences) {
  const response = await axios.patch(`${URL}/users/me/preferences`, preferences);
  return response.data;
}

// From the link in a new-recipe email; works without logging in
export async function unsubscribe(userId, token) {
  const response = await axios.post(`${URL}/users/unsubscribe`, { u: userId, t: token });
  return response.data;
}

export async function logoutRequest() {
  await axios.post(`${URL}/users/logout`);
}

export async function verifyEmail(token) {
  const response = await axios.post(`${URL}/users/verify-email`, { token });
  return response.data;
}

export async function requestPasswordReset(email) {
  const response = await axios.post(`${URL}/users/forgot-password`, { email });
  return response.data;
}

export async function resetPassword(token, password) {
  const response = await axios.post(`${URL}/users/reset-password`, { token, password });
  return response.data;
}

export async function resendVerification() {
  const response = await axios.post(`${URL}/users/me/resend-verification`);
  return response.data;
}

export async function getBackups() {
  const response = await axios.get(`${URL}/admin/backups`);
  return response.data;
}

export async function createBackupNow() {
  const response = await axios.post(`${URL}/admin/backups`);
  return response.data;
}

export async function getUsers() {
  const response = await axios.get(`${URL}/users`);
  return response.data;
}

export async function exportMyData() {
  const response = await axios.get(`${URL}/users/me/export`);
  return response.data;
}

// Deleting your own account needs your password
export async function deleteMyAccount(id, password) {
  const response = await axios.delete(`${URL}/users/${id}`, { data: { password } });
  return response.data;
}

export async function deleteUser(id) {
  const response = await axios.delete(`${URL}/users/${id}`);
  return response.data;
}

export async function setUserRole(id, role) {
  const response = await axios.patch(`${URL}/users/${id}/role`, { role });
  return response.data;
}

export async function createUser(user) {
  const response = await axios.post(`${URL}/users`, user);
  return response;
}

// Logs in (the server sets the session cookie). Returns { success: true } or { error } to show.
export async function verifyUser(user) {
  try {
    const response = await axios.post(`${URL}/users/login`, user);
    if (response.data.success) {
      return { success: true };
    }
    return { error: response.data.message || "Invalid email or password" };
  } catch (error) {
    // Wrong password (401) or too many attempts (429) come with a message to show
    if (error.response?.data?.message) {
      return { error: error.response.data.message };
    }
    console.error("Login request failed:", error);
    return { error: "Can't reach the server right now. Please try again later." };
  }
}
