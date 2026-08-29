import { NextRequest, NextResponse } from "next/server";
import {
  fetchTaxonomyMenu,
  fetchTaxonomyNodes,
  type TaxonomyDepartment,
} from "../../../../lib/catalog-taxonomy";

export const revalidate = 300;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const department = params.get("department") as TaxonomyDepartment | null;
  const region = (params.get("region") || "us").toLowerCase();
  const activeOnly = params.get("activeOnly") === "1" || params.get("activeOnly") === "true";
  const withCounts = params.get("counts") !== "0";

  if (!department || (department !== "clothing" && department !== "shoes")) {
    return NextResponse.json({ error: "department required (clothing|shoes)" }, { status: 400 });
  }

  if (withCounts) {
    const menu = await fetchTaxonomyMenu({ department, region, activeOnly });
    return NextResponse.json(
      {
        department,
        region,
        taxonomyVersion: "retail-v1",
        nodes: menu,
        fetchedAt: new Date().toISOString(),
      },
      { headers: CACHE_HEADERS }
    );
  }

  const nodes = await fetchTaxonomyNodes({ department, activeOnly });
  return NextResponse.json(
    {
      department,
      taxonomyVersion: "retail-v1",
      nodes,
      fetchedAt: new Date().toISOString(),
    },
    { headers: CACHE_HEADERS }
  );
}
