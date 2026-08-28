import type { SupabaseClient } from "@supabase/supabase-js";

export type ReviewerIdentity = {
  id: string | null;
  name: string;
  role: string | null;
  email: string | null;
};

export function displayReviewerName(input: {
  fullName?: string | null;
  email?: string | null;
} | null): string {
  const name = String(input?.fullName || "").trim();
  if (name && !looksLikeDatabaseId(name)) return name;
  const email = String(input?.email || "").trim();
  if (email && !looksLikeDatabaseId(email)) return email;
  return "Unknown reviewer";
}

export function looksLikeDatabaseId(value: string | null | undefined): boolean {
  const raw = String(value || "").trim();
  if (!raw) return false;
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw) ||
    /^[0-9a-f]{8}$/i.test(raw)
  );
}

export function formatReviewerLine(reviewer: ReviewerIdentity, timestamp?: string | null): string {
  const when = timestamp ? formatOperatorTime(timestamp) : null;
  const role = reviewer.role ? reviewer.role.replaceAll("_", " ") : null;
  return [reviewer.name, role, when].filter(Boolean).join(" · ");
}

export function formatOperatorTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 19);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function loadOrgMemberDirectory(
  client: SupabaseClient,
  organizationId: string
): Promise<Map<string, ReviewerIdentity>> {
  const directory = new Map<string, ReviewerIdentity>();
  const rpc = await client.rpc("org_member_directory", { target: organizationId });
  if (!rpc.error && Array.isArray(rpc.data)) {
    for (const row of rpc.data as Array<{
      profile_id: string;
      full_name: string | null;
      email: string | null;
      role: string | null;
    }>) {
      directory.set(row.profile_id, {
        id: row.profile_id,
        name: displayReviewerName({ fullName: row.full_name, email: row.email }),
        role: row.role,
        email: row.email,
      });
    }
    return directory;
  }
  const self = await client.from("profiles").select("id, full_name, email").maybeSingle();
  if (self.data?.id) {
    directory.set(self.data.id, {
      id: self.data.id,
      name: displayReviewerName({ fullName: self.data.full_name, email: self.data.email }),
      role: null,
      email: self.data.email,
    });
  }
  return directory;
}

export function reviewerFromDirectory(
  directory: Map<string, ReviewerIdentity>,
  profileId: string | null | undefined
): ReviewerIdentity {
  if (profileId && directory.has(profileId)) return directory.get(profileId)!;
  return { id: profileId || null, name: "Unknown reviewer", role: null, email: null };
}
