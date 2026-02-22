import { queryClient } from "./queryClient";

async function handleResponse(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(body.message || `Request failed with status ${res.status}`);
  }
  return res.json();
}

function apiFetch(url: string, options: RequestInit = {}) {
  return fetch(url, { ...options, credentials: "include" });
}

export const api = {
  async login(username: string, password: string) {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(res);
  },

  async signup(data: { username: string; email: string; password: string; name?: string }) {
    const res = await apiFetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async logout() {
    const res = await apiFetch("/api/auth/logout", { method: "POST" });
    return handleResponse(res);
  },

  async getMe() {
    const res = await apiFetch("/api/auth/me");
    if (res.status === 401) return null;
    return handleResponse(res);
  },

  async getDesigners(query?: string) {
    const url = query ? `/api/designers?q=${encodeURIComponent(query)}` : "/api/designers";
    const res = await apiFetch(url);
    return handleResponse(res);
  },

  async getDesigner(slug: string) {
    const res = await apiFetch(`/api/designers/${slug}`);
    return handleResponse(res);
  },

  async getFavorites() {
    const res = await apiFetch("/api/favorites");
    if (res.status === 401) return [];
    return handleResponse(res);
  },

  async addFavorite(designerId: string) {
    const res = await apiFetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designerId }),
    });
    return handleResponse(res);
  },

  async removeFavorite(designerId: string) {
    const res = await apiFetch(`/api/favorites/${designerId}`, { method: "DELETE" });
    return handleResponse(res);
  },

  async checkFavorite(designerId: string) {
    const res = await apiFetch(`/api/favorites/check/${designerId}`);
    return handleResponse(res);
  },

  async submitQuiz(data: {
    materials: string[];
    priceRange: string;
    syntheticTolerance: string;
    favoriteBrands: string[];
    profileType?: string;
    recommendation?: string;
  }) {
    const res = await apiFetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getQuizResults() {
    const res = await apiFetch("/api/quiz/results");
    if (res.status === 401) return [];
    return handleResponse(res);
  },

  async getRecommendation(data: {
    materials: string[];
    priceRange: string;
    syntheticTolerance: string;
    favoriteBrands: string[];
  }) {
    const res = await apiFetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};
