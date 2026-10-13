import axios from "axios";
import { getToken } from "./auth";

const URL = import.meta.env.VITE_API_URL || "";

axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export async function createPost(post) {
  const imageId = await uploadImage(post.file);
  const response = await axios.post(`${URL}/posts`, {
    title: post.title,
    description: post.description,
    content: post.content,
    cuisines: post.cuisines,
    imageId,
  });
  return response;
}

export async function updatePost(id, post) {
  const changes = {
    title: post.title,
    description: post.description,
    content: post.content,
    cuisines: post.cuisines,
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

export async function getUsers() {
  const response = await axios.get(`${URL}/users`);
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

// Returns { token } on success or { error } with a message to show the user
export async function verifyUser(user) {
  try {
    const response = await axios.post(`${URL}/users/login`, user);
    if (response.data.success) {
      return { token: response.data.token };
    }
    return { error: response.data.message || "Invalid email or password" };
  } catch (error) {
    console.error("Login request failed:", error);
    return { error: "Can't reach the server right now. Please try again later." };
  }
}
