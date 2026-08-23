import api from "./api.js";

export function getPosts() {
  return api.get("/posts").then((res) => res.data);
}

export function getMyPosts() {
  return api.get("/posts/mine").then((res) => res.data);
}

export function getPost(id) {
  return api.get(`/posts/${id}`).then((res) => res.data);
}

export function createPost(payload) {
  return api.post("/posts", payload).then((res) => res.data);
}

export function updatePost(id, payload) {
  return api.put(`/posts/${id}`, payload).then((res) => res.data);
}

export function deletePost(id) {
  return api.delete(`/posts/${id}`).then((res) => res.data);
}

export function addComment(postId, content) {
  return api.post(`/posts/${postId}/comments`, { content }).then((res) => res.data);
}

export function updateComment(postId, commentId, content) {
  return api.put(`/posts/${postId}/comments/${commentId}`, { content }).then((res) => res.data);
}

export function deleteComment(postId, commentId) {
  return api.delete(`/posts/${postId}/comments/${commentId}`).then((res) => res.data);
}

export function likePost(postId) {
  return api.put(`/posts/${postId}/like`).then((res) => res.data);
}
