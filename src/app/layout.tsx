import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { SiteFooter } from "@/components/SiteFooter";
import { PWAProvider } from "@/components/PWAProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/Header";
import { getValidAdsenseClientId } from "@/lib/adsense";

const validAdsenseClientId = getValidAdsenseClientId(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID);

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Plan Before Trade: Crypto Analysis for Smart Trades",
    template: "%s | Plan Before Trade",
  },
  description:
    "Plan Before Trade: Crypto Analysis for Smart Trades. AI-powered platform with usage-based free tier and premium features like watchlists, alerts, and saved analyses.",
  keywords: [
    "crypto trading signals",
    "bitcoin analysis",
    "ethereum trading",
    "crypto market scanner",
    "trading signals",
    "technical analysis",
    "market structure",
    "support resistance",
    "liquidity calculator",
    "crypto backtesting",
    "risk management",
    "position sizing",
    "average calculator",
    "liquidation calculator",
    "smart money concepts",
    "SMC trading",
    "crypto watchlist",
    "trading alerts",
    "AI crypto analysis",
    "crypto trading platform",
    "forex signals",
    "futures trading",
    "perpetual futures",
    "trade confirmation",
    "entry signals",
    "market opportunities",
    "crypto intelligence",
    "trading strategy",
    "candlestick analysis",
    "RSI indicator",
    "EMA crossover",
    "price action trading",
    "breakout trading",
    "retest strategy",
    "USDT-M perpetual",
    "binance trading",
    "bitget exchange",
    "MEXC trading",
    "crypto DCA",
    "dollar cost averaging",
    "trading plan",
    "risk reward ratio",
    "trade journal",
    "backtesting results",
    "equity curve",
    "win rate calculator",
    "crypto tax tools",
    "trading education",
    "market analysis tools"
  ],
  openGraph: {
    title: "Plan Before Trade: Crypto Analysis for Smart Trades",
    description:
      "Analyze crypto markets with confidence scoring, support/resistance levels, and premium productivity tools.",
    url: "/",
    siteName: "Plan Before Trade",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Plan Before Trade: Crypto Analysis for Smart Trades",
    description:
      "AI-powered crypto analysis with premium watchlists, saved analyses, and alerts.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Plan Before Trade",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  ...(validAdsenseClientId ? { other: { "google-adsense-account": validAdsenseClientId } } : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        
        <Header />
        <AnalyticsTracker />
        {children}
        <PWAProvider />
        <SiteFooter />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
