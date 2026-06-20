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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://planbeforetrade.tech"),
  alternates: {
    canonical: "/",
  },
  title: {
    default: "Plan Before Trade | Crypto Trading Signals & Market Analysis",
    template: "%s | Plan Before Trade",
  },
  description:
    "Get crypto trading signals, market analysis, risk management strategies, and AI-powered insights to help you plan before every trade.",
  keywords: [
    "Plan Before Trade",
    "Crypto Trading Signals",
    "Trading Signals",
    "Crypto Analysis",
    "Bitcoin Signals",
    "Altcoin Signals",
    "Technical Analysis",
    "Market Analysis",
    "Risk Management",
    "Trading Strategy",
    "AI Crypto Trading",
    "Crypto Market Opportunities",
    "crypto trading signals",
    "bitcoin analysis",
    "ethereum trading",
    "crypto market scanner",
    "technical analysis",
    "market structure",
    "support resistance",
    "liquidity calculator",
    "crypto backtesting",
    "position sizing",
    "average calculator",
    "liquidation calculator",
    "smart money concepts",
    "SMC trading",
    "crypto watchlist",
    "trading alerts",
    "crypto trading platform",
    "forex signals",
    "futures trading",
    "perpetual futures",
    "trade confirmation",
    "entry signals",
    "market opportunities",
    "crypto intelligence",
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
    title: "Plan Before Trade | Smart Crypto Trading Decisions",
    description:
      "Access crypto trading signals, AI-powered market analysis, technical indicators, and risk management tools.",
    url: "https://planbeforetrade.tech",
    siteName: "Plan Before Trade",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Plan Before Trade | Crypto Signals & Analysis",
    description:
      "Discover profitable crypto opportunities with advanced market analysis and trading signals.",
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
