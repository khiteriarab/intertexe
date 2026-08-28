const FORBIDDEN = new Set(["organization", "org", "slug", "organization_id", "org_id", "organizationSlug"]);

/** /platform/demo must never accept an org slug or UUID as a selector. */
export function demoRequestHasForbiddenOrgSelector(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): boolean {
  const keys =
    searchParams instanceof URLSearchParams
      ? Array.from(searchParams.keys())
      : Object.keys(searchParams);
  return keys.some((key) => FORBIDDEN.has(key));
}
