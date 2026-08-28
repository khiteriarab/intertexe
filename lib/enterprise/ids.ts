import { isReservedHqSlug, isValidOrgSlug } from "./constants";

export function slugifyOrganizationName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (!slug) return "";
  if (!isValidOrgSlug(slug) || isReservedHqSlug(slug)) return `${slug}-org`;
  return slug;
}

export function newPublicId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("");
  return `itx_${raw.slice(0, 20)}`;
}
