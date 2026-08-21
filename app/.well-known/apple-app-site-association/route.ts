/**
 * Apple App Site Association.
 *
 * LIVE App Store 1.0.1 includes Universal Link routing for the paths below.
 * Do NOT claim /p, /p/*, /go, or /go/* — Weekly Edit emails hop through
 * /go/{id} (retailer listing) and /p/{id} (web PDP) so Gmail cannot send
 * /open or a broken /product Universal Link to the Shop tab.
 * Do NOT claim /inspirations* — iOS 1.0.1 has no handler (falls through to home).
 * Do NOT claim /khiteri* — previously caused Safari "Action can't be completed".
 * Do NOT claim /download — explicit App Store-only hop.
 * Do NOT use a blanket /* rule.
 */
const AASA = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appIDs: ["4VXD5QFLA2.com.stellarcommunications.intertexe"],
        components: [
          { "/": "/open" },
          { "/": "/open/*" },
          { "/": "/scanner" },
          { "/": "/scanner/*" },
          { "/": "/product/*" },
          { "/": "/designers" },
          { "/": "/designers/*" },
          { "/": "/collections" },
          { "/": "/collections/*" },
          { "/": "/favorites" },
          { "/": "/favorites/*" },
          { "/": "/account" },
          { "/": "/account/*" },
          { "/": "/reset-password" },
          { "/": "/reset-password/*" },
          { "/": "/capture" },
          { "/": "/capture/*" },
          { "/": "/sale" },
          { "/": "/sale/*" },
          { "/": "/shop" },
          { "/": "/shop/*" },
          { "/": "/materials" },
          { "/": "/materials/*" },
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
      // Short TTL so Apple CDN + devices pick up AASA changes quickly.
      "Cache-Control": "public, max-age=300",
    },
  });
}
