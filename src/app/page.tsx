import Link from "next/link";
import type { Metadata } from "next";
import { Navigation } from "@/components/Navigation";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Crypto Analysis SaaS for Smarter Trades",
  description:
    "Plan Before Trade helps traders analyze crypto markets with confidence scoring, risk levels, and premium tools.",
};

/**
 * Landing Page
 * This is the public home page for marketing.
 * The main app dashboard is now at /dashboard
 */
export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header} style={{ marginBottom: "48px" }}>
          <div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>CRYPTO COINS ANALYSIS PLATFORM</h1>
              <p className={styles.subtitle}>
                Get AI-powered technical analysis for 3,000+ crypto coins across Binance, Bitget, and MEXC.
                Make smarter trading decisions with confidence scores, support/resistance levels, and risk management.
              </p>
            </div>
          </div>
        </header>

        <Navigation />

        <section className={styles.grid}>
          <div className={styles.card}>
            <h2>📊 Technical Analysis</h2>
            <p style={{ color: "#cbd5f5", marginBottom: "16px" }}>
              SMA, RSI, momentum, and volatility indicators combined into a clear 
              LONG/SHORT recommendation with confidence scoring.
            </p>
            <ul style={{ color: "#94a3b8", listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>✓ 3,000+ USDT trading pairs</li>
              <li>✓ Multi-exchange support</li>
              <li>✓ Multiple timeframes (1m to 1W)</li>
              <li>✓ Real-time price data</li>
            </ul>
          </div>

          <div className={styles.card}>
            <h2>🎯 Risk Management</h2>
            <p style={{ color: "#cbd5f5", marginBottom: "16px" }}>
              Plan entries, exits, and downside protection with a wider risk toolkit built for active trade management.
            </p>
            <ul style={{ color: "#94a3b8", listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>✓ 1:3 and 1:2 risk/reward planning</li>
              <li>✓ 3 take-profit levels</li>
              <li>✓ Calculated stop-loss</li>
              <li>✓ Support & resistance zones</li>
              <li>✓ Order block detection and liquidation awareness</li>
            </ul>
          </div>

          <div className={styles.card}>
            <h2>🧮 Average Coin Calculator</h2>
            <p style={{ color: "#cbd5f5", marginBottom: "16px" }}>
              Track your blended entry price across multiple buys, estimate profit and loss, and review the impact of new entries before you add more capital.
            </p>
            <ul style={{ color: "#94a3b8", listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>✓ Multiple entry averaging</li>
              <li>✓ Live profit and loss simulation</li>
              <li>✓ Exchange-based coin selection</li>
              <li>✓ Built for premium trade planning</li>
            </ul>
          </div>

          <div className={styles.card}>
            <h2>📈 Interactive Charts</h2>
            <p style={{ color: "#cbd5f5", marginBottom: "16px" }}>
              Professional candlestick charts with overlays for SMA, support/resistance 
              areas, and entry/exit levels.
            </p>
            <ul style={{ color: "#94a3b8", listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>✓ Candlestick visualization</li>
              <li>✓ SMA trend line</li>
              <li>✓ Target & stop-loss markers</li>
              <li>✓ Order block zones</li>
            </ul>
          </div>

          <div className={styles.card}>
            <h2>👀 Watchlists</h2>
            <p style={{ color: "#cbd5f5", marginBottom: "16px" }}>
              Group your favorite coins into premium watchlists, keep track of the setups you care about, and revisit them whenever the market changes.
            </p>
            <ul style={{ color: "#94a3b8", listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>✓ Saved coin collections</li>
              <li>✓ Premium-only workflow</li>
              <li>✓ Easy price tracking</li>
              <li>✓ Built for trade monitoring</li>
            </ul>
          </div>

          <div className={styles.card}>
            <h2>🧮 Liquidation Calculator</h2>
            <p style={{ color: "#cbd5f5", marginBottom: "16px" }}>
              Compare estimated liquidation prices across Binance, Bitget, and MEXC before you size a leveraged trade.
            </p>
            <ul style={{ color: "#94a3b8", listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>✓ Exchange-by-exchange comparison</li>
              <li>✓ Long and short support</li>
              <li>✓ Isolated and cross margin</li>
              <li>✓ Built into the live web app</li>
            </ul>
          </div>
        </section>

        <section style={{ textAlign: "center", marginTop: "48px" }}>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link 
              href="/signup" 
              className={styles.button}
              style={{ 
                width: "auto", 
                padding: "16px 48px", 
                fontSize: "18px",
                textDecoration: "none",
                display: "inline-block"
              }}
            >
              Get Started Free
            </Link>
            <Link 
              href="/login" 
              className={styles.navLink}
              style={{ 
                padding: "16px 32px", 
                fontSize: "16px",
              }}
            >
              Sign In
            </Link>
          </div>
          <p style={{ color: "#64748b", marginTop: "16px", fontSize: "14px" }}>
            Free tier: 3 analyses per day • No credit card required
          </p>
        </section>

        <section style={{ textAlign: "center", marginTop: "64px" }}>
          <h2 style={{ color: "#e2e8f0", marginBottom: "32px" }}>Pricing</h2>
          <div className={styles.grid} style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div className={styles.card}>
              <h2 style={{ background: "#64748b" }}>Free</h2>
              <p style={{ fontSize: "36px", fontWeight: "700", margin: "16px 0" }}>$0</p>
              <ul style={{ color: "#94a3b8", listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                <li>3 analyses per day</li>
                <li>All exchanges</li>
                <li>All timeframes</li>
                <li>Basic features</li>
              </ul>
              <Link href="/signup" className={styles.button} style={{ textDecoration: "none" }}>
                Start Free
              </Link>
            </div>

            <div className={styles.card} style={{ border: "2px solid #38bdf8" }}>
              <h2 style={{ background: "linear-gradient(135deg, #38bdf8, #6366f1)" }}>Premium</h2>
              <p style={{ fontSize: "36px", fontWeight: "700", margin: "16px 0" }}>$4.99<span style={{ fontSize: "16px", color: "#94a3b8" }}>/mo</span></p>
              <ul style={{ color: "#94a3b8", listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                <li>✓ Unlimited analyses</li>
                <li>✓ Save analyses</li>
                <li>✓ Watchlists</li>
                <li>✓ Price alerts</li>
                <li>✓ Priority support</li>
                <li>✓ Average Calculator</li>
                <li>✓ Liquidation Calculator</li>
              </ul>
              <Link href="/pricing" className={styles.button} style={{ textDecoration: "none" }}>
                View Plans
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
