import Script from "next/script";
import { getValidAdsenseClientId } from "@/lib/adsense";

export function Header() {
  const adsenseClientId = getValidAdsenseClientId(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID);
  if (!adsenseClientId) return null;

  return (
    <Script
      id="google-adsense"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
      crossOrigin="anonymous"
    />
  );
}
