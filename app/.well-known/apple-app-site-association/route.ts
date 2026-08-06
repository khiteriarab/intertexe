/**
 * Apple App Site Association — Universal Links for INTERTEXE.
 * Served at /.well-known/apple-app-site-association (no file extension).
 * Team ID 4VXD5QFLA2 · bundle com.stellarcommunications.intertexe
 */
const AASA = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appIDs: ["4VXD5QFLA2.com.stellarcommunications.intertexe"],
        components: [
          { "/": "/" },
          { "/": "/open*" },
          { "/": "/shop*" },
          { "/": "/product/*" },
          { "/": "/designers/*" },
          { "/": "/collections/*" },
          { "/": "/scanner*" },
          { "/": "/sale*" },
          { "/": "/account*" },
          { "/": "/khiteri*" },
          { "/": "/materials*" },
          { "/": "/favorites*" },
        ],
      },
    ],
  },
  webcredentials: {
    apps: ["4VXD5QFLA2.com.stellarcommunications.intertexe"],
  },
};

export function GET() {
  return new Response(JSON.stringify(AASA), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
