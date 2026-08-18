export const dynamic = "force-static";

const BODY = "google-site-verification: google86cefdb626fe12b8.html\n";

export function GET() {
  return new Response(BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
