"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "../page.module.css";

function PricingContent() {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");
  
  const [showUpgradeModal, setShowUpgradeModal] = useState<"monthly" | "yearly" | null>(null);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
<div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>PRICING</h1>
              <p className={styles.subtitle}>
Choose the plan that&apos;s right for you. Upgrade anytime.
              </p>
            </div>
          </div>
        </header>

        {paymentStatus === "cancelled" && (
          <div className={styles.error} style={{ marginBottom: "24px" }}>
            Payment was cancelled. You can try again anytime.
          </div>
        )}

        <section className={styles.grid} style={{ maxWidth: "900px", margin: "0 auto" }}>
          {/* Free Plan */}
          <div className={styles.card}>
            <h2 style={{ background: "#64748b" }}>Free</h2>
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: "48px", fontWeight: "700", margin: "16px 0 8px" }}>$0</p>
              <p style={{ color: "#64748b", fontSize: "14px" }}>Forever free</p>
            </div>
            
            <ul style={{ 
              color: "#94a3b8", 
              listStyle: "none", 
              padding: 0, 
              display: "flex", 
              flexDirection: "column", 
              gap: "12px", 
              margin: "24px 0",
              textAlign: "left"
            }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> 3 analyses per day
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> All exchanges (Binance, Bitget, MEXC)
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> All timeframes (1m to 1W)
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> Technical indicators
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> Interactive charts
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b" }}>
                <span style={{ color: "#64748b" }}>✗</span> Watchlists
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b" }}>
                <span style={{ color: "#64748b" }}>✗</span> Saved analyses
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b" }}>
                <span style={{ color: "#64748b" }}>✗</span> Price alerts
              </li>
            </ul>

            <Link 
              href="/signup" 
              className={styles.navLink}
              style={{ display: "block", textAlign: "center", padding: "12px 24px" }}
            >
              Get Started
            </Link>
          </div>

          {/* Monthly Plan */}
          <div className={styles.card} style={{ border: "2px solid #38bdf8", position: "relative" }}>
            <div style={{
              position: "absolute",
              top: "-12px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "linear-gradient(135deg, #38bdf8, #6366f1)",
              color: "#0f172a",
              padding: "4px 16px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: "600",
            }}>
              MOST POPULAR
            </div>
            <h2 style={{ background: "linear-gradient(135deg, #38bdf8, #6366f1)" }}>Premium Monthly</h2>
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: "48px", fontWeight: "700", margin: "16px 0 8px" }}>
                $4.99<span style={{ fontSize: "18px", color: "#94a3b8" }}>/mo</span>
              </p>
              <p style={{ color: "#64748b", fontSize: "14px" }}>Billed monthly</p>
            </div>
            
            <ul style={{ 
              color: "#e2e8f0", 
              listStyle: "none", 
              padding: 0, 
              display: "flex", 
              flexDirection: "column", 
              gap: "12px", 
              margin: "24px 0",
              textAlign: "left"
            }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> <strong>Unlimited</strong> analyses
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> All exchanges (Binance, Bitget, MEXC)
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> All timeframes (1m to 1W)
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> Technical indicators
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> Interactive charts
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#38bdf8" }}>✓</span> Watchlists
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#38bdf8" }}>✓</span> Saved analyses
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#38bdf8" }}>✓</span> Price alerts
              </li>
            </ul>

            <button
              onClick={() => setShowUpgradeModal("monthly")}
              className={styles.button}
            >
              Subscribe Monthly
            </button>
          </div>

          {/* Yearly Plan */}
          <div className={styles.card}>
            <h2 style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}>Premium Yearly</h2>
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: "48px", fontWeight: "700", margin: "16px 0 8px" }}>
                $49.99<span style={{ fontSize: "18px", color: "#94a3b8" }}>/yr</span>
              </p>
              <p style={{ color: "#22c55e", fontSize: "14px", fontWeight: "600" }}>
                Save $9.89/year (16.5% off)
              </p>
            </div>
            
            <ul style={{ 
              color: "#e2e8f0", 
              listStyle: "none", 
              padding: 0, 
              display: "flex", 
              flexDirection: "column", 
              gap: "12px", 
              margin: "24px 0",
              textAlign: "left"
            }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> <strong>Unlimited</strong> analyses
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> All exchanges (Binance, Bitget, MEXC)
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> All timeframes (1m to 1W)
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> Technical indicators
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#22c55e" }}>✓</span> Interactive charts
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#fbbf24" }}>✓</span> Watchlists
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#fbbf24" }}>✓</span> Saved analyses
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#fbbf24" }}>✓</span> Price alerts
              </li>
            </ul>

            <button
              onClick={() => setShowUpgradeModal("yearly")}
              className={styles.button}
              style={{ 
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)"
              }}
            >
              Subscribe Yearly
            </button>
          </div>
        </section>

        {/* Pakistan Payment Option */}
        <section style={{ textAlign: "center", marginTop: "48px", padding: "32px", background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px" }}>
          <h3 style={{ color: "#e2e8f0", marginBottom: "16px" }}>🇵🇰 Pakistan Payment Options</h3>
          <p style={{ color: "#94a3b8", marginBottom: "16px" }}>
            Pay with Easypaisa or JazzCash for PKR 350/week
          </p>
          <Link 
            href="/pricing/pakistan" 
            className={styles.navLink}
            style={{ display: "inline-block", padding: "12px 32px" }}
          >
            Pay with Easypaisa/JazzCash
          </Link>
        </section>

        {/* International Bank Transfer Option */}
        <section style={{ textAlign: "center", marginTop: "24px", padding: "32px", background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px" }}>
          <h3 style={{ color: "#e2e8f0", marginBottom: "16px" }}>🌍 International Bank Transfers</h3>
          <p style={{ color: "#94a3b8", marginBottom: "16px" }}>
            Pay via wire transfer, ACH, or SWIFT for USD $4.99/month
          </p>
          <Link 
            href="/pricing/international" 
            className={styles.navLink}
            style={{ display: "inline-block", padding: "12px 32px" }}
          >
            Pay via Bank Transfer
          </Link>
        </section>

        {/* FAQ */}
        <section style={{ maxWidth: "700px", margin: "48px auto 0" }}>
          <h3 style={{ color: "#e2e8f0", marginBottom: "24px", textAlign: "center" }}>
            Frequently Asked Questions
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: "20px", borderRadius: "12px" }}>
              <p style={{ color: "#e2e8f0", fontWeight: "600", marginBottom: "8px" }}>
                Can I cancel anytime?
              </p>
              <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                Yes! You can cancel your subscription at any time. You&apos;ll retain access until the end of your billing period.
              </p>
            </div>
            
            <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: "20px", borderRadius: "12px" }}>
              <p style={{ color: "#e2e8f0", fontWeight: "600", marginBottom: "8px" }}>
                What payment methods do you accept?
              </p>
                <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                  For Pakistan, we accept Easypaisa and JazzCash (PKR 350/week). For international users, we accept bank transfers in USD.
                </p>
            </div>
            
            <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: "20px", borderRadius: "12px" }}>
              <p style={{ color: "#e2e8f0", fontWeight: "600", marginBottom: "8px" }}>
                Is this financial advice?
              </p>
              <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                No. Plan Before Trade provides technical analysis tools only. Always do your own research and never invest more than you can afford to lose.
              </p>
            </div>
          </div>
        </section>

        <div style={{ textAlign: "center", marginTop: "48px" }}>
          <Link href="/dashboard" className={styles.navLink}>
            ← Back to Dashboard
          </Link>
        </div>

        {/* Upgrade Payment Options Modal */}
        {showUpgradeModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}>
            <div style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%"
            }}>
              <h2 style={{ color: "#e2e8f0", marginBottom: "24px", textAlign: "center" }}>
                Choose Payment Method
              </h2>
              <p style={{ color: "#94a3b8", marginBottom: "24px", textAlign: "center" }}>
                {showUpgradeModal === "monthly" 
                  ? "Subscribe to Premium Monthly ($4.99/month)" 
                  : "Subscribe to Premium Yearly ($49.99/year)"}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Link
                  href={`/pricing/pakistan?plan=${showUpgradeModal}`}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    color: "#e2e8f0",
                    padding: "16px",
                    borderRadius: "8px",
                    textAlign: "center",
                    textDecoration: "none",
                    fontWeight: "500",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#334155";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#1e293b";
                  }}
                >
                  🇵🇰 Pay with Easypaisa/JazzCash
                </Link>

                <Link
                  href={`/pricing/international?plan=${showUpgradeModal}`}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    color: "#e2e8f0",
                    padding: "16px",
                    borderRadius: "8px",
                    textAlign: "center",
                    textDecoration: "none",
                    fontWeight: "500",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#334155";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#1e293b";
                  }}
                >
                  🌍 Pay via Bank Transfer (USD)
                </Link>
              </div>

              <button
                onClick={() => setShowUpgradeModal(null)}
                style={{
                  marginTop: "16px",
                  width: "100%",
                  background: "transparent",
                  border: "1px solid #334155",
                  color: "#94a3b8",
                  padding: "12px",
                  borderRadius: "8px",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <main className={styles.main}>
            <div style={{ textAlign: "center", marginTop: "80px", color: "#94a3b8" }}>
              Loading pricing...
            </div>
          </main>
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
