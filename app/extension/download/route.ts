import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const FILE_NAME = "INTERTEXE-Fabric-Scanner-1.0.19.zip";

/** Chrome Web Store zip with Content-Disposition so the browser actually downloads it. */
export async function GET() {
  const filePath = path.join(process.cwd(), "public", "downloads", FILE_NAME);
  const body = await readFile(filePath);
  return new Response(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${FILE_NAME}"`,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
