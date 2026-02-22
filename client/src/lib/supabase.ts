import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export interface Designer {
  id: string;
  name: string;
  slug: string;
  status: string;
  naturalFiberPercent: number | null;
  description: string | null;
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
    createdAt: row.created_at ?? null,
  };
}

export async function fetchDesigners(query?: string): Promise<Designer[]> {
  if (!supabase) {
    const url = query ? `/api/designers?q=${encodeURIComponent(query)}` : "/api/designers";
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
      .limit(50);
    if (error) throw error;
    return (data || []).map(mapRow);
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
