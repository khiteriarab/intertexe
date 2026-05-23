/**
 * Unified taste profile — single source: user_preferences (web + iOS).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type TastePreferencesPayload = {
  preferredFibers?: string[];
  preferredDesigners?: string[];
  preferredOccasions?: string[];
  preferredSilhouettes?: string[];
  syntheticTolerance?: number;
  priceMin?: number | null;
  priceMax?: number | null;
  profileType?: string | null;
  quizRecommendation?: unknown;
};

export async function upsertTastePreferences(
  supabase: SupabaseClient,
  userId: string,
  payload: TastePreferencesPayload
): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  if (payload.preferredFibers != null) row.preferred_fibers = payload.preferredFibers;
  if (payload.preferredDesigners != null) row.preferred_designers = payload.preferredDesigners;
  if (payload.preferredOccasions != null) row.preferred_occasions = payload.preferredOccasions;
  if (payload.preferredSilhouettes != null) row.preferred_silhouettes = payload.preferredSilhouettes;
  if (payload.syntheticTolerance != null) row.synthetic_tolerance = payload.syntheticTolerance;
  if (payload.priceMin !== undefined) row.price_min = payload.priceMin;
  if (payload.priceMax !== undefined) row.price_max = payload.priceMax;
  if (payload.profileType != null) row.profile_type = payload.profileType;
  if (payload.quizRecommendation != null) {
    row.quiz_recommendation = payload.quizRecommendation;
    row.quiz_completed_at = new Date().toISOString();
  }
  await supabase.from("user_preferences").upsert(row);
}

export async function fetchTastePreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<TastePreferencesPayload | null> {
  const { data } = await supabase
    .from("user_preferences")
    .select(
      "preferred_fibers, preferred_designers, preferred_occasions, preferred_silhouettes, synthetic_tolerance, price_min, price_max, profile_type, quiz_recommendation"
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    preferredFibers: data.preferred_fibers || [],
    preferredDesigners: data.preferred_designers || [],
    preferredOccasions: data.preferred_occasions || [],
    preferredSilhouettes: data.preferred_silhouettes || [],
    syntheticTolerance: data.synthetic_tolerance ?? 10,
    priceMin: data.price_min,
    priceMax: data.price_max,
    profileType: data.profile_type,
    quizRecommendation: data.quiz_recommendation,
  };
}
