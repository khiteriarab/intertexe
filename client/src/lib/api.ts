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

const TOKEN_KEY = "intertexe_auth_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(body.message || `Request failed with status ${res.status}`);
  }
  return res.json();
}

function apiFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}

export const api = {
  async login(username: string, password: string) {
    if (isVercelMode) {
      return supabaseLogin(username, password);
    }
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await handleResponse(res);
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  async signup(data: { username: string; email: string; password: string; name?: string }) {
    if (isVercelMode) {
      return supabaseSignup({ email: data.email, password: data.password, name: data.name });
    }
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(res);
    if (result.token) {
      setToken(result.token);
    }
    return result;
  },

  async logout() {
    if (isVercelMode) {
      return supabaseLogout();
    }
    const res = await apiFetch("/api/auth/logout", { method: "POST" });
    clearToken();
    return handleResponse(res);
  },

  async getMe() {
    if (isVercelMode) {
      return supabaseGetMe();
    }
    const token = getToken();
    if (!token) return null;
    const res = await apiFetch("/api/auth/me");
    if (res.status === 401) {
      clearToken();
      return null;
    }
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

  async getProductFavorites(): Promise<string[]> {
    const res = await apiFetch("/api/product-favorites");
    if (res.status === 401) return [];
    const data = await handleResponse(res);
    return data.productIds || [];
  },

  async addProductFavorite(productId: string) {
    const res = await apiFetch("/api/product-favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    return handleResponse(res);
  },

  async removeProductFavorite(productId: string) {
    const res = await apiFetch(`/api/product-favorites/${encodeURIComponent(productId)}`, { method: "DELETE" });
    return handleResponse(res);
  },

  async syncProductFavorites(productIds: string[]): Promise<string[]> {
    const res = await apiFetch("/api/product-favorites/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds }),
    });
    const data = await handleResponse(res);
    return data.productIds || [];
  },

  async addRecent(productId: string, productUrl?: string, brandName?: string) {
    const res = await apiFetch("/api/recents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, productUrl, brandName }),
    });
    return handleResponse(res);
  },

  async getRecents(limit: number = 20) {
    const res = await apiFetch(`/api/recents?limit=${limit}`);
    if (res.status === 401) return [];
    const data = await handleResponse(res);
    return data.recents || [];
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
