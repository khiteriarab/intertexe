import { queryClient } from "./queryClient";
import {
  isVercelMode,
  supabaseSignup,
  supabaseLogin,
  supabaseLogout,
  supabaseGetMe,
  supabaseSubmitQuiz,
  supabaseGetQuizResults,
  supabaseGetRecommendation,
  supabaseGetFavorites,
  supabaseAddFavorite,
  supabaseRemoveFavorite,
  supabaseCheckFavorite,
} from "./supabase";

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
    if (isVercelMode) {
      return supabaseLogin(username, password);
    }
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(res);
  },

  async signup(data: { username: string; email: string; password: string; name?: string }) {
    if (isVercelMode) {
      return supabaseSignup({ email: data.email, password: data.password, name: data.name });
    }
    const res = await apiFetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async logout() {
    if (isVercelMode) {
      return supabaseLogout();
    }
    const res = await apiFetch("/api/auth/logout", { method: "POST" });
    return handleResponse(res);
  },

  async getMe() {
    if (isVercelMode) {
      return supabaseGetMe();
    }
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
    if (isVercelMode) {
      return supabaseGetFavorites();
    }
    const res = await apiFetch("/api/favorites");
    if (res.status === 401) return [];
    return handleResponse(res);
  },

  async addFavorite(designerId: string) {
    if (isVercelMode) {
      return supabaseAddFavorite(designerId);
    }
    const res = await apiFetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designerId }),
    });
    return handleResponse(res);
  },

  async removeFavorite(designerId: string) {
    if (isVercelMode) {
      return supabaseRemoveFavorite(designerId);
    }
    const res = await apiFetch(`/api/favorites/${designerId}`, { method: "DELETE" });
    return handleResponse(res);
  },

  async checkFavorite(designerId: string) {
    if (isVercelMode) {
      return supabaseCheckFavorite(designerId);
    }
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
    if (isVercelMode) {
      return supabaseSubmitQuiz(data);
    }
    const res = await apiFetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getQuizResults() {
    if (isVercelMode) {
      return supabaseGetQuizResults();
    }
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
    if (isVercelMode) {
      return supabaseGetRecommendation(data);
    }
    const res = await apiFetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};
