import { NextResponse } from "next/server";
import { materialOpenApiDocument } from "../../../lib/material-intelligence/openapi";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(materialOpenApiDocument(), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
