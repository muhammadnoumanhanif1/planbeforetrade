"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase-client";
import { Navigation } from "@/components/Navigation";
import styles from "../page.module.css";

export default function AboutPage() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
<div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>
                Plan Before Trade
              </p>
              <h1>ABOUT US</h1>
            </div>
          </div>
        </header>

        {isAuthenticated && <Navigation />}

        <section className={styles.grid}>
          <div className={styles.card}>
            <h2>About Plan Before Trade</h2>
            <p style={{ color: "#cbd5e1", lineHeight: 1.6, marginBottom: 16 }}>
              Plan Before Trade is a comprehensive cryptocurrency analysis platform designed to help traders make informed decisions with confidence. Our mission is to empower traders with professional-grade tools and insights.
            </p>

            <h3 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>Key Features</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div style={{ padding: 12, backgroundColor: "rgba(52, 168, 83, 0.1)", borderRadius: 6 }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#34a853" }}>Coin Analysis</h4>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>
                  In-depth technical and market analysis for spot trading across multiple exchanges.
                </p>
              </div>

              <div style={{ padding: 12, backgroundColor: "rgba(52, 168, 83, 0.1)", borderRadius: 6 }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#34a853" }}>Watchlists</h4>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>
                  Create and manage personalized watchlists with real-time price tracking and alerts.
                </p>
              </div>

              <div style={{ padding: 12, backgroundColor: "rgba(52, 168, 83, 0.1)", borderRadius: 6 }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#34a853" }}>Average Calculator</h4>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>
                  Track your purchase history and calculate average buying prices with ease.
                </p>
              </div>

              <div style={{ padding: 12, backgroundColor: "rgba(52, 168, 83, 0.1)", borderRadius: 6 }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#34a853" }}>Price Alerts</h4>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>
                  Get notified when cryptocurrency prices reach your target levels.
                </p>
              </div>

              <div style={{ padding: 12, backgroundColor: "rgba(52, 168, 83, 0.1)", borderRadius: 6 }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#34a853" }}>Risk Management</h4>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>
                  Calculate risk ratios (1:2, 1:3) and set optimal stop losses and take profits.
                </p>
              </div>

              <div style={{ padding: 12, backgroundColor: "rgba(52, 168, 83, 0.1)", borderRadius: 6 }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#34a853" }}>Multi-Exchange Support</h4>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>
                  Trade across Binance, Bitget, and MEXC with unified analysis tools.
                </p>
              </div>
            </div>

            <h3 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>Why Choose Plan Before Trade?</h3>
            <ul style={{ color: "#cbd5e1", lineHeight: 1.8, paddingLeft: 20 }}>
              <li>Professional-grade analysis tools for all experience levels</li>
              <li>Real-time market data from multiple exchanges</li>
              <li>Intuitive interface designed for crypto traders</li>
              <li>Premium features including advanced alerts and analytics</li>
              <li>Secure platform with bank-level encryption</li>
              <li>24/7 platform availability with 99.9% uptime guarantee</li>
            </ul>

            <h3 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>Our Mission</h3>
            <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
              We believe that every trader deserves access to professional tools and insights. Our platform is built to democratize crypto trading analysis, making sophisticated tools accessible to traders of all levels. We're committed to continuous improvement and adding features based on community feedback.
            </p>

            <h3 style={{ marginTop: 24, marginBottom: 12, color: "rgb(15, 23, 42)" }}>Contact & Support</h3>
            <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
              Have questions or feedback? We'd love to hear from you!{" "}
              <Link href="/contact-us" style={{ color: "#34a853", textDecoration: "none", fontWeight: 600 }}>
                Contact us here
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
