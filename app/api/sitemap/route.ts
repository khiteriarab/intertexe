import { NextResponse } from "next/server";
import { SITE_URL } from "../../../lib/seo-international";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

/**
 * Legacy sitemap endpoint. Google Search Console should use /sitemap.xml.
 * Keep this alias so previously submitted /api/sitemap URLs still resolve.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const page = searchParams.get("page") || "0";

  if (!type) {
    return NextResponse.redirect(`${SITE_URL}/sitemap.xml`, 308);
  }
  if (type === "pages") {
    return NextResponse.redirect(`${SITE_URL}/sitemap/static.xml`, 308);
  }
  if (type === "designers") {
    return NextResponse.redirect(`${SITE_URL}/sitemap/brands-${page}.xml`, 308);
  }
  if (type === "products") {
    return NextResponse.redirect(`${SITE_URL}/sitemap/products-${page}.xml`, 308);
  }
  return new NextResponse("Invalid sitemap type", { status: 400 });
}
