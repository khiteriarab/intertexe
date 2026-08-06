/**
 * Apple App Site Association.
 * Empty content paths until the App Store build with UL routing is live —
 * claiming /khiteri* caused Safari “Action can't be completed” on Download.
 */
const AASA = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appIDs: ["4VXD5QFLA2.com.stellarcommunications.intertexe"],
        components: [] as { "/": string }[],
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
      "Cache-Control": "public, max-age=300",
    },
  });
}
