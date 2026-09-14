export const CATALOG_SORTS = [
  "priority",
  "issues",
  "recent",
  "updated",
  "name",
  "name_desc",
] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const CATALOG_SORT_LABELS: Record<CatalogSort, string> = {
  priority: "Priority fixes",
  issues: "Most issues",
  recent: "Recently added",
  updated: "Recently updated",
  name: "Name A–Z",
  name_desc: "Name Z–A",
};

export function parseCatalogSort(value?: string | null): CatalogSort {
  if (value && (CATALOG_SORTS as readonly string[]).includes(value)) {
    return value as CatalogSort;
  }
  return "priority";
}

export function catalogSortNeedsFullFetch(sort: CatalogSort): boolean {
  return sort === "priority" || sort === "issues";
}

type SortableProduct = {
  name: string;
  created_at: string;
  last_updated_at: string;
  openIssueCount: number;
  blockingIssueCount: number;
  passport_state: string | null;
};

function passportUrgency(state: string | null): number {
  if (state === "review_required") return 40;
  if (state === "update_required") return 35;
  if (state === "incomplete") return 25;
  if (state === "ready") return 10;
  return 0;
}

function priorityScore(row: SortableProduct): number {
  return (
    row.blockingIssueCount * 1000 +
    row.openIssueCount * 100 +
    passportUrgency(row.passport_state)
  );
}

export function sortCatalogProducts<T extends SortableProduct>(rows: T[], sort: CatalogSort): T[] {
  const copy = [...rows];
  switch (sort) {
    case "priority":
      copy.sort((a, b) => {
        const diff = priorityScore(b) - priorityScore(a);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      });
      break;
    case "issues":
      copy.sort((a, b) => {
        const diff = b.openIssueCount - a.openIssueCount || b.blockingIssueCount - a.blockingIssueCount;
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      });
      break;
    case "recent":
      copy.sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || ""));
      break;
    case "updated":
      copy.sort((a, b) => Date.parse(b.last_updated_at || "") - Date.parse(a.last_updated_at || ""));
      break;
    case "name_desc":
      copy.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "name":
    default:
      copy.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }
  return copy;
}
