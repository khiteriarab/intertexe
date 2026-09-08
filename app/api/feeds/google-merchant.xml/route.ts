import { NextResponse } from "next/server";
import {
  getGoogleMerchantSupabase,
  googleMerchantFeedFooter,
  googleMerchantFeedHeader,
  googleMerchantItemXml,
  iterateGoogleMerchantRows,
} from "../../../../lib/google-merchant-feed";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const supabase = getGoogleMerchantSupabase();
  if (!supabase) {
    return new NextResponse("Google Merchant feed unavailable (missing Supabase credentials)", {
      status: 503,
    });
  }

  const encoder = new TextEncoder();
  let itemCount = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(googleMerchantFeedHeader()));

        for await (const row of iterateGoogleMerchantRows(supabase)) {
          const item = googleMerchantItemXml(row);
          if (!item) continue;
          controller.enqueue(encoder.encode(item));
          itemCount += 1;
        }

        controller.enqueue(encoder.encode(googleMerchantFeedFooter()));
        controller.close();
      } catch (err) {
        console.error("[google-merchant-feed]", err);
        controller.error(err);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Feed-Items": String(itemCount),
    },
  });
}
