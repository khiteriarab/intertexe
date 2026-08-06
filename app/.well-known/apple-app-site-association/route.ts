/**
 * Apple App Site Association — Universal Links for INTERTEXE.
 *
 * Until the App Store build with associated domains + routing ships, only
 * claim /open*. Claiming /khiteri* made Safari try (and fail) to hand off
 * to the app from the editorial page Download CTA.
 */
const AASA = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appIDs: ["4VXD5QFLA2.com.stellarcommunications.intertexe"],
        components: [
          // Re-add shop/product/designers/collections/scanner/khiteri after the UL build is live.
          { "/": "/open*" },
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
