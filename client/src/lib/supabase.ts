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

function guessBrandWebsite(name: string): string | null {
  const KNOWN: Record<string, string> = {
    "alexander wang": "alexanderwang.com", "ralph lauren": "ralphlauren.com",
    "tommy hilfiger": "tommyhilfiger.com", "calvin klein": "calvinklein.com",
    "michael kors": "michaelkors.com", "marc jacobs": "marcjacobs.com",
    "kate spade": "katespade.com", "tory burch": "toryburch.com",
    "diane von furstenberg": "dvf.com", "oscar de la renta": "oscardelarenta.com",
    "carolina herrera": "carolinaherrera.com", "helmut lang": "helmutlang.com",
    "rag & bone": "rag-bone.com", "acne studios": "acnestudios.com",
    "a.p.c.": "apc.fr", "maison margiela": "maisonmargiela.com",
    "rick owens": "rickowens.eu", "the row": "therow.com",
    "bottega veneta": "bottegaveneta.com", "saint laurent": "ysl.com",
    "louis vuitton": "louisvuitton.com", "gucci": "gucci.com",
    "prada": "prada.com", "burberry": "burberry.com",
    "givenchy": "givenchy.com", "balenciaga": "balenciaga.com",
    "valentino": "valentino.com", "fendi": "fendi.com",
    "dior": "dior.com", "celine": "celine.com", "loewe": "loewe.com",
    "chanel": "chanel.com", "hermès": "hermes.com", "versace": "versace.com",
    "dolce & gabbana": "dolcegabbana.com", "armani": "armani.com",
    "giorgio armani": "armani.com", "emporio armani": "armani.com",
    "moncler": "moncler.com", "stone island": "stoneisland.com",
    "off-white": "off---white.com", "fear of god": "fearofgod.com",
    "amiri": "amiri.com", "tom ford": "tomford.com",
    "stella mccartney": "stellamccartney.com", "isabel marant": "isabelmarant.com",
    "nanushka": "nanushka.com", "ganni": "ganni.com", "cos": "cos.com",
    "& other stories": "stories.com", "zara": "zara.com",
    "massimo dutti": "massimodutti.com", "uniqlo": "uniqlo.com",
    "j.crew": "jcrew.com", "theory": "theory.com", "vince": "vince.com",
    "brunello cucinelli": "brunellocucinelli.com", "loro piana": "loropiana.com",
    "zegna": "zegna.com", "tod's": "tods.com", "ferragamo": "ferragamo.com",
    "jimmy choo": "jimmychoo.com", "christian louboutin": "christianlouboutin.com",
    "nike": "nike.com", "adidas": "adidas.com", "new balance": "newbalance.com",
    "the north face": "thenorthface.com", "patagonia": "patagonia.com",
    "canada goose": "canadagoose.com", "barbour": "barbour.com",
    "allsaints": "allsaints.com", "paul smith": "paulsmith.com",
    "vivienne westwood": "viviennewestwood.com",
    "alexander mcqueen": "alexandermcqueen.com",
    "max mara": "maxmara.com", "jil sander": "jilsander.com",
    "sacai": "sacai.jp", "issey miyake": "isseymiyake.com",
    "kenzo": "kenzo.com", "ami paris": "amiparis.com",
    "jacquemus": "jacquemus.com", "lemaire": "lemaire.fr",
    "reformation": "thereformation.com", "anine bing": "aninebing.com",
    "khaite": "khaite.com", "proenza schouler": "proenzaschouler.com",
    "coach": "coach.com", "hugo boss": "hugoboss.com",
    "diesel": "diesel.com", "balmain": "balmain.com",
    "lanvin": "lanvin.com", "mugler": "mugler.com",
    "chloé": "chloe.com", "sandro": "sandro-paris.com",
    "maje": "maje.com", "h&m": "hm.com",
    "thom browne": "thombrowne.com", "golden goose": "goldengoose.com",
    "everlane": "everlane.com", "lululemon": "lululemon.com",
    "zimmermann": "zimmermann.com", "veja": "veja-store.com",
  };
  const lower = name.toLowerCase().trim();
  if (KNOWN[lower]) return `https://${KNOWN[lower]}`;
  const cleaned = lower.replace(/[®™*#°]/g, '').replace(/\s+/g, '').replace(/[&+]/g, '').replace(/[''`]/g, '').replace(/[^a-z0-9.-]/g, '');
  if (cleaned.length < 2) return null;
  return `https://${cleaned}.com`;
}

const BRAND_NAME_OVERRIDES: Record<string, string> = {
  "LES (ART)ISTS": "Les Artistes",
  "LOST [in] ME": "Lost in Me",
  "Red(V)": "Red V",
  "Vlone(GOAT)": "Vlone",
  "Weekend(er)": "Weekender",
  "THE (Alphabet)": "The Alphabet",
  "Who*s Who": "Who's Who",
  "PropÃ©t": "Propet",
  "A_COLD_WALL*": "A-Cold-Wall*",
};

function mapRow(row: any): Designer {
  const website = row.website ?? guessBrandWebsite(row.name);
  const rawName = row.name || '';
  const cleanName = BRAND_NAME_OVERRIDES[rawName] || rawName.replace(/[®™©°]/g, '').replace(/\*+/g, '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s*\[[^\]]*\]\s*/g, ' ').replace(/[!]+$/g, '').replace(/\s{2,}/g, ' ').trim();
  return {
    id: row.id,
    name: cleanName || rawName,
    slug: row.slug,
    status: row.status || "Pending",
    naturalFiberPercent: row.natural_fiber_percent ?? null,
    description: row.description ?? null,
    website,
    createdAt: row.created_at ?? null,
  };
}

let designerCache: Designer[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchDesignersFromAPI(query?: string, limit?: number): Promise<Designer[]> {
  let url = query ? `/api/designers?q=${encodeURIComponent(query)}` : "/api/designers";
  if (limit) url += (url.includes("?") ? "&" : "?") + `limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchDesigners(query?: string, limit?: number): Promise<Designer[]> {
  if (!isVercelMode) {
    return fetchDesignersFromAPI(query, limit);
  }

  if (!supabase) {
    return fetchDesignersFromAPI(query, limit);
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

export async function fetchDesignersByNames(names: string[]): Promise<Designer[]> {
  if (!isVercelMode || !supabase) {
    const res = await fetch(`/api/designers?names=${encodeURIComponent(names.join(','))}`);
    if (!res.ok) return [];
    return res.json();
  }

  const { data, error } = await supabase
    .from("designers")
    .select("*")
    .in("name", names);
  if (error) return [];
  return (data || []).map(mapRow);
}

export async function fetchDesignerBySlug(slug: string): Promise<Designer | null> {
  if (!isVercelMode) {
    const res = await fetch(`/api/designers/${slug}`);
    if (!res.ok) return null;
    return res.json();
  }

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

  try {
    const apiBase = import.meta.env.VITE_API_URL || "";
    const res = await fetch(`${apiBase}/api/supabase-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, password: data.password, name: data.name }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Signup failed");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (signInError) console.warn("Auto sign-in after signup failed:", signInError.message);

    return result as SupabaseUser;
  } catch (serverErr: any) {
    console.warn("Server signup unavailable, falling back to direct Supabase:", serverErr.message);
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: "https://intertexe.com",
    },
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

  try {
    if (supabase) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        supabase.from("users").update({ fabric_persona: persona.id }).eq("id", authData.user.id)
          .then(() => {})
          .catch((err: any) => console.error("Failed to update persona:", err));
      }
    }
  } catch (e) {
    console.error("Non-critical: failed to update persona in Supabase", e);
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

  const designerIds = (data || []).map((row: any) => row.designer_id).filter(Boolean);
  let designerMap: Record<string, any> = {};

  if (designerIds.length > 0) {
    const { data: designers } = await supabase
      .from("designers")
      .select("*")
      .in("id", designerIds);

    if (designers) {
      for (const d of designers) {
        const rawName = d.name || "";
        const cleanName = BRAND_NAME_OVERRIDES[rawName] || rawName.replace(/[®™©°]/g, '').replace(/\*+/g, '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s*\[[^\]]*\]\s*/g, ' ').replace(/[!]+$/g, '').replace(/\s{2,}/g, ' ').trim();
        designerMap[d.id] = {
          id: d.id,
          name: cleanName || rawName,
          slug: d.slug,
          naturalFiberPercent: d.natural_fiber_percent ?? d.naturalFiberPercent ?? null,
          description: d.description,
          website: d.website,
        };
      }
    }
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    designerId: row.designer_id,
    createdAt: row.created_at,
    designer: designerMap[row.designer_id] || null,
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
