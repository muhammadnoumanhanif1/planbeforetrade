"use client";

import { useState, useEffect } from "react";
import styles from "@/app/page.module.css";
import { getLivePrice } from "@/lib/livePrice";
import { usePlanningContext } from "../context";

export default function ConvertPage() {
  const { coin: coinA, exchange, livePrice: priceA } = usePlanningContext();
  
  const [coinB, setCoinB] = useState<string>("ETH");
  const [amountA, setAmountA] = useState<string>("1");
  const [priceB, setPriceB] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchPriceB = async () => {
      if (!coinB) return;
      setLoading(true);
      try {
        const symbolB = coinB.toUpperCase().endsWith("USDT") ? coinB.toUpperCase() : `${coinB.toUpperCase()}USDT`;
        const pB = await getLivePrice(symbolB, exchange);
        if (isMounted) {
          setPriceB(pB);
        }
      } catch (error) {
        console.error("Failed to fetch price B", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPriceB();
    
    return () => {
      isMounted = false;
    };
  }, [coinB, exchange]);

  const parsedAmountA = parseFloat(amountA) || 0;
  
  // Example calculation:
  // If 1 BTC = 65000 USDT and 1 ETH = 3500 USDT
  // Then 1 BTC = (65000 / 3500) ETH
  const amountB = (priceA && priceB && priceB > 0) ? (parsedAmountA * priceA) / priceB : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
      
      <div className={styles.glassCard} style={{ padding: "30px", background: "rgba(15, 23, 42, 0.7)" }}>
        <h2 className={styles.gradientText} style={{ fontSize: "1.5rem", margin: "0 0 24px 0", borderBottom: "1px solid rgba(148,163,184,0.1)", paddingBottom: "12px" }}>
          Crypto Converter
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* From Section */}
          <div style={{ padding: "20px", background: "rgba(30, 41, 59, 0.5)", borderRadius: "12px", border: "1px solid rgba(148, 163, 184, 0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>From (Global Context)</label>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Price: {priceA ? `$${priceA.toFixed(4)}` : "..."}
              </span>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ width: "40%", padding: "12px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.6)", color: "#f8fafc", fontWeight: "bold", fontSize: "1.1rem" }}>
                {coinA}
              </div>
              <input 
                type="number" 
                className={styles.inputField}
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                placeholder="0.00"
                min="0"
                step="any"
                style={{ width: "60%", padding: "12px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)", color: "#f8fafc", fontSize: "1.1rem" }}
              />
            </div>
          </div>

          {/* Swap Icon Area */}
          <div style={{ display: "flex", justifyContent: "center", margin: "-16px 0" }}>
            <div style={{ 
              width: "48px", height: "48px", borderRadius: "50%", 
              background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(2, 6, 23, 0.5)", zIndex: 2
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/>
              </svg>
            </div>
          </div>

          {/* To Section */}
          <div style={{ padding: "20px", background: "rgba(30, 41, 59, 0.5)", borderRadius: "12px", border: "1px solid rgba(148, 163, 184, 0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>To</label>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Price: {priceB ? `$${priceB.toFixed(4)}` : "..."}
              </span>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <input 
                type="text" 
                className={styles.inputField}
                value={coinB}
                onChange={(e) => setCoinB(e.target.value.toUpperCase())}
                placeholder="ETH"
                style={{ width: "40%", padding: "12px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)", color: "#f8fafc", fontSize: "1.1rem" }}
              />
              <div style={{ width: "60%", padding: "12px", fontSize: "1.5rem", fontWeight: "bold", color: "#10b981", textAlign: "right", fontFamily: "monospace" }}>
                {loading ? "..." : amountB.toFixed(6)}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
