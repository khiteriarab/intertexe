import { createClient } from "@supabase/supabase-js";
import { assignPersona } from "@shared/personas";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const isVercelMode = !!import.meta.env.VITE_USE_SUPABASE_AUTH && !!supabase;

export interface Designer {
  id: string;
  name: string;
  slug: string;
  status: string;
  naturalFiberPercent: number | null;
  description: string | null;
  website: string | null;
  createdAt: string | null;
}

function mapRow(row: any): Designer {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status || "Pending",
    naturalFiberPercent: row.natural_fiber_percent ?? null,
    description: row.description ?? null,
    website: row.website ?? null,
    createdAt: row.created_at ?? null,
  };
}

let designerCache: Designer[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function fetchDesigners(query?: string, limit?: number): Promise<Designer[]> {
  if (!supabase) {
    let url = query ? `/api/designers?q=${encodeURIComponent(query)}` : "/api/designers";
    if (limit) url += (url.includes("?") ? "&" : "?") + `limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return res.json();
  }

  if (query) {
    const { data, error } = await supabase
      .from("designers")
      .select("*")
      .ilike("name", `%${query}%`)
      .order("name", { ascending: true })
      .limit(limit || 50);
    if (error) throw error;
    return (data || []).map(mapRow);
  }

  if (limit) {
    const { data, error } = await supabase
      .from("designers")
      .select("*")
      .order("name", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(mapRow);
  }

  if (designerCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return designerCache;
  }

  const all: Designer[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("designers")
      .select("*")
      .order("name", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data.map(mapRow));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  designerCache = all;
  cacheTimestamp = Date.now();
  return all;
}

export async function fetchDesignerBySlug(slug: string): Promise<Designer | null> {
  if (!supabase) {
    const res = await fetch(`/api/designers/${slug}`);
    if (!res.ok) return null;
    return res.json();
  }

  const { data, error } = await supabase
    .from("designers")
    .select("*")
    .eq("slug", slug)
    .limit(1)
    .single();
  if (error) return null;
  return data ? mapRow(data) : null;
}

export interface SupabaseUser {
  id: string;
  email: string;
  name: string | null;
  username: string;
  subscriptionTier: string;
  fabricPersona: string | null;
}

function mapUserRow(row: any): SupabaseUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    username: row.username || row.email,
    subscriptionTier: row.subscription_tier || "free",
    fabricPersona: row.fabric_persona || null,
  };
}

export async function supabaseSignup(data: { email: string; password: string; name?: string }): Promise<SupabaseUser> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("Signup failed");

  const userId = authData.user.id;
  const username = data.email.split("@")[0] + "_" + userId.slice(0, 6);

  const { error: insertError } = await supabase.from("users").insert({
    id: userId,
    email: data.email,
    name: data.name || null,
    username: username,
    password: "supabase-auth",
    subscription_tier: "free",
    fabric_persona: null,
  });

  if (insertError) {
    console.error("Failed to create user profile:", insertError.message);
  }

  return {
    id: userId,
    email: data.email,
    name: data.name || null,
    username: username,
    subscriptionTier: "free",
    fabricPersona: null,
  };
}

export async function supabaseLogin(emailOrUsername: string, password: string): Promise<SupabaseUser> {
  if (!supabase) throw new Error("Supabase not configured");

  let email = emailOrUsername;
  if (!emailOrUsername.includes("@")) {
    const { data: userRow } = await supabase
      .from("users")
      .select("email")
      .eq("username", emailOrUsername)
      .single();
    if (userRow) email = userRow.email;
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("Login failed");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authData.user.id)
    .single();

  if (profile) {
    return mapUserRow(profile);
  }

  return {
    id: authData.user.id,
    email: authData.user.email || email,
    name: null,
    username: email.split("@")[0],
    subscriptionTier: "free",
    fabricPersona: null,
  };
}

export async function supabaseLogout(): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function supabaseGetMe(): Promise<SupabaseUser | null> {
  if (!supabase) return null;

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (profile) {
    return mapUserRow(profile);
  }

  return {
    id: authUser.id,
    email: authUser.email || "",
    name: null,
    username: (authUser.email || "").split("@")[0],
    subscriptionTier: "free",
    fabricPersona: null,
  };
}

export async function supabaseSubmitQuiz(data: {
  materials: string[];
  priceRange: string;
  syntheticTolerance: string;
  favoriteBrands: string[];
  profileType?: string;
  recommendation?: string;
}): Promise<any> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: { user: authUser } } = await supabase.auth.getUser();
  const userId = authUser?.id || null;

  const { data: result, error } = await supabase
    .from("quiz_results")
    .insert({
      user_id: userId,
      materials: data.materials,
      price_range: data.priceRange,
      synthetic_tolerance: data.syntheticTolerance,
      favorite_brands: data.favoriteBrands,
      profile_type: data.profileType || null,
      recommendation: data.recommendation || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (userId && data.profileType) {
    const persona = assignPersona({
      materials: data.materials,
      syntheticTolerance: data.syntheticTolerance || "Depends on the piece",
    });
    supabase.from("users").update({ fabric_persona: persona.id }).eq("id", userId)
      .then(() => {})
      .catch((err: any) => console.error("Failed to update persona:", err));
  }

  return result;
}

export async function supabaseGetQuizResults(): Promise<any[]> {
  if (!supabase) return [];

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return [];

  const { data, error } = await supabase
    .from("quiz_results")
    .select("*")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data || []).map((row: any) => {
    let materials = row.materials;
    if (typeof materials === "string") {
      try { materials = JSON.parse(materials); } catch { materials = [materials]; }
    }
    return {
      id: row.id,
      userId: row.user_id,
      materials: Array.isArray(materials) ? materials : [materials],
      priceRange: row.price_range,
      syntheticTolerance: row.synthetic_tolerance,
      favoriteBrands: row.favorite_brands || [],
      profileType: row.profile_type,
      recommendation: row.recommendation,
      createdAt: row.created_at,
    };
  });
}

export async function supabaseGetRecommendation(data: {
  materials: string[];
  priceRange: string;
  syntheticTolerance: string;
  favoriteBrands: string[];
}): Promise<any> {
  const persona = assignPersona({
    materials: data.materials || [],
    syntheticTolerance: data.syntheticTolerance || "Depends on the piece",
    priceRange: data.priceRange || undefined,
  });

  const { data: { user: authUser } } = await supabase!.auth.getUser();
  if (authUser) {
    supabase!.from("users").update({ fabric_persona: persona.id }).eq("id", authUser.id)
      .then(() => {})
      .catch((err: any) => console.error("Failed to update persona:", err));
  }

  return {
    profileType: persona.name,
    personaId: persona.id,
    recommendation: persona.description,
    coreValue: persona.coreValue,
    buysFor: persona.buysFor,
    suggestedDesignerTypes: persona.suggestedDesignerTypes,
    recommendedMaterials: persona.recommendedMaterials,
  };
}

export async function supabaseGetFavorites(): Promise<any[]> {
  if (!supabase) return [];

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return [];

  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    designerId: row.designer_id,
    createdAt: row.created_at,
  }));
}

export async function supabaseAddFavorite(designerId: string): Promise<any> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", authUser.id)
    .eq("designer_id", designerId)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error("Already favorited");
  }

  const { data, error } = await supabase
    .from("favorites")
    .insert({
      user_id: authUser.id,
      designer_id: designerId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function supabaseRemoveFavorite(designerId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", authUser.id)
    .eq("designer_id", designerId);

  if (error) throw new Error(error.message);
}

export async function supabaseCheckFavorite(designerId: string): Promise<{ favorited: boolean }> {
  if (!supabase) return { favorited: false };

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { favorited: false };

  const { data } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", authUser.id)
    .eq("designer_id", designerId)
    .limit(1);

  return { favorited: (data && data.length > 0) || false };
}
