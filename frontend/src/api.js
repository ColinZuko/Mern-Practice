import axios from "axios";

const URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// NEW: Fetch top 6 trending/most viewed posts
export async function getTrendingPosts() {
  const response = await axios.get(`${URL}/posts/trending`);

  if (response.status === 200) {
    return response.data;
  } else {
    return []; // Return clean empty fallback array on failure
  }
}

export async function getPosts(searchQuery = "", cuisineFilter = "") {
  let url = `${URL}/posts?`;
  if (searchQuery) {
    url += `search=${encodeURIComponent(searchQuery)}&`;
  }
  if (cuisineFilter) {
    url += `cuisine=${encodeURIComponent(cuisineFilter)}&`;
  }

  const response = await axios.get(url);

  if (response.status === 200) {
    return response.data;
  } else {
    return;
  }
}

export async function getPost(id) {
  const response = await axios.get(`${URL}/posts/${id}`);

  const post = response.data;
  const data = await getImage(post.imageId);
  post.image = data;
  return post;
}

export async function createPost(post) {
  const data = await createImage(post.file);
  const imageId = post.file.name;

  post.imageId = imageId;

  const response = await axios.post(`${URL}/posts`, post);
  return response;
}

export async function updatePost(id, updatedData) {
  const response = await axios.put(`${URL}/posts/${id}`, updatedData);
  return response;
}

export async function deletePost(id) {
  const response = await axios.delete(`${URL}/posts/${id}`);
  return response;
}

export async function getUser(id) {
  const response = await axios.get(`${URL}/users/${id}`);

  if (response.status === 200) {
    return response.data;
  } else {
    return;
  }
}

export async function createUser(user) {
  const response = await axios.post(`${URL}/users`, user);
  return response;
}

export async function updateUser(id, user) {
  const response = await axios.put(`${URL}/users/${id}`, user);
  return response;
}

export async function verifyUser(user) {
  const response = await axios.post(`${URL}/users/login`, user);
  if (response.data.success) {
    return response.data.token;
  } else {
    return;
  }
}

export async function createImage(file) {
  const formData = new FormData();
  formData.append("image", file);
  const response = await axios.post(`${URL}/images`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response;
}

export async function getImage(id) {
  const response = await axios.get(`${URL}/images/${id}`);
  return response;
}
