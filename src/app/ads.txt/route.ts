import { NextResponse } from "next/server";
import { getValidAdsenseClientId } from "@/lib/adsense";

const validAdsenseClientId = getValidAdsenseClientId(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID);
const CACHE_DURATION_SECONDS = 3600;

export function GET() {
  if (!validAdsenseClientId) {
    return new NextResponse("AdSense publisher ID is not configured.\n", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const sellerAccountId = validAdsenseClientId.substring(3);
  const body = `google.com, ${sellerAccountId}, DIRECT, f08c47fec0942fa0\n`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_DURATION_SECONDS}, s-maxage=${CACHE_DURATION_SECONDS}`,
    },
  });
}
