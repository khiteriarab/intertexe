import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const routes = [
    "/api/catalog?region=us&limit=48",
    "/api/catalog?region=eu&limit=48",
    "/api/catalog?sort=new&region=us&limit=48",
    "/api/sale?region=us&limit=48",
    "/api/catalog?fiber=cotton&region=us&limit=48",
    "/api/catalog?fiber=silk&region=us&limit=48",
    "/api/catalog?fiber=linen&region=us&limit=48",
    "/api/catalog?collection=vacation&region=us&limit=6",
    "/api/catalog?collection=evening&region=us&limit=6",
    "/api/catalog?collection=tailoring&region=us&limit=6",
    "/api/scan",
  ];

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com";

  await Promise.all(
    routes.map((route) =>
      fetch(`${baseUrl}${route}`, {
        method: route.includes("/api/scan") ? "POST" : "GET",
        headers: route.includes("/api/scan")
          ? { "Content-Type": "application/json" }
          : undefined,
        body: route.includes("/api/scan") ? "{}" : undefined,
      }).catch(() => null)
    )
  );

  return NextResponse.json({
    warmed: routes.length,
    at: new Date().toISOString(),
  });
}
