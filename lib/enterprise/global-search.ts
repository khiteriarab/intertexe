import type { SupabaseClient } from "@supabase/supabase-js";

export type GlobalSearchResult = {
  kind: "product" | "issue" | "passport" | "supplier";
  id: string;
  label: string;
  detail: string | null;
  href: string;
};

export async function globalEnterpriseSearch(
  client: SupabaseClient,
  organizationId: string,
  orgSlug: string,
  query: string,
  limit = 20
): Promise<GlobalSearchResult[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  const pattern = `%${q.replace(/[%_]/g, "")}%`;
  const perKind = Math.ceil(limit / 4);

  const [products, issues, passports, suppliers] = await Promise.all([
    client
      .from("products")
      .select("id, name, sku, style_code")
      .eq("organization_id", organizationId)
      .eq("lifecycle", "active")
      .or(`name.ilike.${pattern},sku.ilike.${pattern},style_code.ilike.${pattern}`)
      .limit(perKind),
    client
      .from("issues")
      .select("id, title, issue_type, status")
      .eq("organization_id", organizationId)
      .ilike("title", pattern)
      .limit(perKind),
    client
      .from("passports")
      .select("id, public_id, status")
      .eq("organization_id", organizationId)
      .or(`public_id.ilike.${pattern}`)
      .limit(perKind),
    client
      .from("suppliers")
      .select("id, name, email")
      .eq("organization_id", organizationId)
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(perKind),
  ]);

  const results: GlobalSearchResult[] = [];
  for (const p of products.data || []) {
    results.push({
      kind: "product",
      id: p.id,
      label: p.name || p.sku || "Product",
      detail: [p.sku, p.style_code].filter(Boolean).join(" · ") || null,
      href: `/dashboard/${orgSlug}/products/${p.id}`,
    });
  }
  for (const i of issues.data || []) {
    results.push({
      kind: "issue",
      id: i.id,
      label: i.title || "Issue",
      detail: `${i.issue_type} · ${i.status}`,
      href: `/dashboard/${orgSlug}/issues`,
    });
  }
  for (const p of passports.data || []) {
    results.push({
      kind: "passport",
      id: p.id,
      label: p.public_id || "Passport",
      detail: p.status,
      href: `/dashboard/${orgSlug}/passports`,
    });
  }
  for (const s of suppliers.data || []) {
    results.push({
      kind: "supplier",
      id: s.id,
      label: s.name,
      detail: s.email,
      href: `/dashboard/${orgSlug}/suppliers`,
    });
  }
  return results.slice(0, limit);
}
