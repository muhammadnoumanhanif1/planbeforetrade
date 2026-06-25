"use client";

import { useState, useEffect } from "react";
import styles from "@/app/page.module.css";
import { usePlanningContext } from "../context";

export default function TpSlPage() {
  const { coin, livePrice, loadingPrice } = usePlanningContext();
  
  const [entryPrice, setEntryPrice] = useState<string>("");
  const [positionSizeUsd, setPositionSizeUsd] = useState<string>("1000");
  const [positionType, setPositionType] = useState<"long" | "short">("long");
  const [tpPercent, setTpPercent] = useState<string>("5");
  const [slPercent, setSlPercent] = useState<string>("2");

  // Automatically fetch live price when coin changes if entry isn't overridden manually
  useEffect(() => {
    if (livePrice && !entryPrice) {
      setEntryPrice(livePrice.toString());
    }
  }, [livePrice, entryPrice]);

  const entry = parseFloat(entryPrice) || 0;
  const sizeUsd = parseFloat(positionSizeUsd) || 0;
  const tpP = parseFloat(tpPercent) || 0;
  const slP = parseFloat(slPercent) || 0;

  let tpPrice = 0;
  let slPrice = 0;

  if (entry > 0) {
    if (positionType === "long") {
      tpPrice = entry * (1 + tpP / 100);
      slPrice = entry * (1 - slP / 100);
    } else {
      tpPrice = entry * (1 - tpP / 100);
      slPrice = entry * (1 + slP / 100);
    }
  }

  // Calculate Risk/Reward Ratio
  const rrRatio = slP > 0 ? (tpP / slP) : 0;
  const profitUsd = sizeUsd * (tpP / 100);
  const lossUsd = sizeUsd * (slP / 100);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
      
      {/* Input Section */}
      <div className={styles.glassCard} style={{ padding: "30px", background: "rgba(15, 23, 42, 0.7)" }}>
        <h2 className={styles.gradientText} style={{ fontSize: "1.5rem", margin: "0 0 24px 0", borderBottom: "1px solid rgba(148,163,184,0.1)", paddingBottom: "12px" }}>
          Risk Manager
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Position Type */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              onClick={() => setPositionType("long")}
              style={{ 
                flex: 1, padding: "12px", borderRadius: "8px", fontWeight: "bold",
                background: positionType === "long" ? "rgba(16, 185, 129, 0.2)" : "rgba(15, 23, 42, 0.4)",
                color: positionType === "long" ? "#10b981" : "#94a3b8",
                border: `1px solid ${positionType === "long" ? "#10b981" : "rgba(148, 163, 184, 0.1)"}`,
                cursor: "pointer", transition: "all 0.2s"
              }}
            >
              LONG 📈
            </button>
            <button 
              onClick={() => setPositionType("short")}
              style={{ 
                flex: 1, padding: "12px", borderRadius: "8px", fontWeight: "bold",
                background: positionType === "short" ? "rgba(239, 68, 68, 0.2)" : "rgba(15, 23, 42, 0.4)",
                color: positionType === "short" ? "#ef4444" : "#94a3b8",
                border: `1px solid ${positionType === "short" ? "#ef4444" : "rgba(148, 163, 184, 0.1)"}`,
                cursor: "pointer", transition: "all 0.2s"
              }}
            >
              SHORT 📉
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Entry Price */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>
                Entry Price {loadingPrice && <span style={{fontSize:"0.8rem", color: "#3b82f6"}}>(...)</span>}
              </label>
              <input 
                type="number" 
                className={styles.inputField}
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                step="any"
                style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)", color: "#f8fafc" }}
              />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Position Size ($)</label>
              <input 
                type="number" 
                className={styles.inputField}
                value={positionSizeUsd}
                onChange={(e) => setPositionSizeUsd(e.target.value)}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)", color: "#f8fafc" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            {/* TP Percent */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", color: "#10b981", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>Take Profit (%)</label>
              <div style={{ position: "relative" }}>
                <input 
                  type="number" 
                  className={styles.inputField}
                  value={tpPercent}
                  onChange={(e) => setTpPercent(e.target.value)}
                  step="any"
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#f8fafc" }}
                />
              </div>
            </div>

            {/* SL Percent */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", color: "#ef4444", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>Stop Loss (%)</label>
              <div style={{ position: "relative" }}>
                <input 
                  type="number" 
                  className={styles.inputField}
                  value={slPercent}
                  onChange={(e) => setSlPercent(e.target.value)}
                  step="any"
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f8fafc" }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Output Section */}
      <div className={styles.glassCard} style={{ padding: "30px", background: "rgba(15, 23, 42, 0.9)", display: "flex", flexDirection: "column", gap: "20px" }}>
        <h2 style={{ fontSize: "1.2rem", margin: "0", color: "#cbd5e1" }}>
          Trade Plan for <span style={{ color: "#38bdf8" }}>{coin || "Asset"}</span>
        </h2>
        
        {/* RR Ratio */}
        <div style={{ padding: "16px", background: "rgba(56, 189, 248, 0.05)", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#38bdf8", fontSize: "1rem", fontWeight: "bold" }}>Risk : Reward</span>
          <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#f8fafc" }}>
            1 : {rrRatio.toFixed(2)}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "10px" }}>
          {/* Target Price */}
          <div style={{ padding: "16px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.3)", display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ color: "#10b981", fontSize: "0.9rem", fontWeight: "bold" }}>Take Profit Price</span>
            <span style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#f8fafc", fontFamily: "monospace" }}>
              ${tpPrice.toFixed(4)}
            </span>
            <span style={{ fontSize: "0.9rem", color: "#10b981", marginTop: "4px" }}>
              +${profitUsd.toFixed(2)}
            </span>
          </div>

          {/* Stop Loss Price */}
          <div style={{ padding: "16px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)", display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ color: "#ef4444", fontSize: "0.9rem", fontWeight: "bold" }}>Stop Loss Price</span>
            <span style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#f8fafc", fontFamily: "monospace" }}>
              ${slPrice.toFixed(4)}
            </span>
            <span style={{ fontSize: "0.9rem", color: "#ef4444", marginTop: "4px" }}>
              -${lossUsd.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
