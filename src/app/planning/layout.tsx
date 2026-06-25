"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/app/page.module.css";
import { ReactNode } from "react";
import { Navigation } from "@/components/Navigation";
import { PlanningProvider, usePlanningContext } from "./context";
import { EXCHANGES } from "@/lib/exchanges";

function PlanningHeader() {
  const pathname = usePathname();
  const { coin, setCoin, exchange, setExchange, livePrice, loadingPrice } = usePlanningContext();

  const isActive = (href: string) => pathname === href;

  const navLinkClassName = (href: string) =>
    `${styles.navLink} ${isActive(href) ? styles.navLinkActive : ""}`.trim();

  return (
    <div className={styles.glassCard} style={{ marginBottom: "20px", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <h1 className={styles.gradientText} style={{ fontSize: "1.8rem", margin: 0 }}>
          Pro Trading Terminal
        </h1>
        
        {/* Global Asset Selector */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "rgba(15, 23, 42, 0.6)", padding: "8px 16px", borderRadius: "12px", border: "1px solid rgba(148, 163, 184, 0.2)" }}>
          <select 
            className={styles.inputField} 
            value={exchange} 
            onChange={(e) => setExchange(e.target.value as any)}
            style={{ padding: "8px", borderRadius: "6px", background: "#0f172a", color: "#e2e8f0", border: "1px solid rgba(148, 163, 184, 0.3)" }}
          >
            {Object.values(EXCHANGES).map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
          
          <input 
            type="text" 
            value={coin}
            onChange={(e) => setCoin(e.target.value.toUpperCase())}
            placeholder="e.g. BTC"
            style={{ width: "100px", padding: "8px", borderRadius: "6px", background: "#0f172a", color: "#e2e8f0", border: "1px solid rgba(148, 163, 184, 0.3)", textTransform: "uppercase" }}
          />
          
          <div style={{ paddingLeft: "12px", borderLeft: "1px solid rgba(148, 163, 184, 0.2)", minWidth: "100px", textAlign: "right" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.8rem", display: "block" }}>Live Price</span>
            <span style={{ color: livePrice ? "#22c55e" : "#94a3b8", fontWeight: "bold", fontFamily: "monospace", fontSize: "1.1rem" }}>
              {loadingPrice && !livePrice ? "..." : livePrice ? `$${livePrice.toFixed(4)}` : "---"}
            </span>
          </div>
        </div>
      </div>

      <nav
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          paddingBottom: "4px",
          borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
        }}
      >
        <Link href="/planning/plan" className={navLinkClassName("/planning/plan")} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
          Position Size
        </Link>
        <Link href="/planning/tp-sl" className={navLinkClassName("/planning/tp-sl")} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
          Risk Manager (TP/SL)
        </Link>
        <Link href="/planning/average" className={navLinkClassName("/planning/average")} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
          DCA Builder
        </Link>
        <Link href="/planning/suggestion" className={navLinkClassName("/planning/suggestion")} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
          AI Bias
        </Link>
        <Link href="/planning/convert" className={navLinkClassName("/planning/convert")} style={{ padding: "8px 16px", fontSize: "0.9rem", marginLeft: "auto" }}>
          Crypto Converter
        </Link>
      </nav>
    </div>
  );
}

export default function PlanningLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Navigation />
        
        <PlanningProvider>
          <PlanningHeader />

          {/* Sub-page Content */}
          <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
            {children}
          </div>
        </PlanningProvider>
      </main>
    </div>
  );
}
