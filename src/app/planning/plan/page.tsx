"use client";

import { useState } from "react";
import styles from "@/app/page.module.css";
import { usePlanningContext } from "../context";

export default function PositionCalculatorPage() {
  const { coin, livePrice, loadingPrice } = usePlanningContext();
  
  const [accountBalance, setAccountBalance] = useState<string>("1000");
  const [riskPercent, setRiskPercent] = useState<string>("1.5");
  const [stopLossPercent, setStopLossPercent] = useState<string>("2.0");
  const [maxLeverage, setMaxLeverage] = useState<string>("10");

  const balance = parseFloat(accountBalance) || 0;
  const riskAmount = (balance * (parseFloat(riskPercent) || 0)) / 100;
  
  const slDist = parseFloat(stopLossPercent) || 0;
  
  // Position Size = Risk Amount / Stop Loss Distance %
  // E.g., Risk $15. SL is 2%. Position Size = $15 / 0.02 = $750
  const positionSizeUsd = slDist > 0 ? (riskAmount / (slDist / 100)) : 0;
  
  // Qty = Position Size / Entry Price
  const qty = livePrice && livePrice > 0 ? positionSizeUsd / livePrice : 0;
  
  // Required Leverage (if we want to use only a fraction of balance, or max out)
  // Leverage = Position Size / Allocated Margin. 
  // Minimum required leverage = Position Size / Account Balance
  const minRequiredLeverage = balance > 0 ? positionSizeUsd / balance : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
      
      {/* Input Section */}
      <div className={styles.glassCard} style={{ padding: "30px", background: "rgba(15, 23, 42, 0.7)" }}>
        <h2 className={styles.gradientText} style={{ fontSize: "1.5rem", margin: "0 0 24px 0", borderBottom: "1px solid rgba(148,163,184,0.1)", paddingBottom: "12px" }}>
          Position Size Calculator
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Total Account Balance ($)</label>
            <input 
              type="number" 
              className={styles.inputField}
              value={accountBalance}
              onChange={(e) => setAccountBalance(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)", color: "#f8fafc", fontSize: "1.1rem" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Risk (%)</label>
              <input 
                type="number" 
                className={styles.inputField}
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
                step="0.1"
                style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)", color: "#f8fafc" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Max Leverge</label>
              <input 
                type="number" 
                className={styles.inputField}
                value={maxLeverage}
                onChange={(e) => setMaxLeverage(e.target.value)}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)", color: "#f8fafc" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "16px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px" }}>
            <label style={{ fontSize: "0.85rem", color: "#f87171", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>Stop Loss Distance (%)</label>
            <input 
              type="number" 
              className={styles.inputField}
              value={stopLossPercent}
              onChange={(e) => setStopLossPercent(e.target.value)}
              step="0.1"
              style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f8fafc" }}
            />
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>How far is your Stop Loss from your Entry Price?</span>
          </div>
        </div>
      </div>

      {/* Output Section */}
      <div className={styles.glassCard} style={{ padding: "30px", background: "rgba(15, 23, 42, 0.9)", display: "flex", flexDirection: "column", gap: "20px" }}>
        <h2 style={{ fontSize: "1.2rem", margin: "0", color: "#cbd5e1" }}>
          Execution Plan for <span style={{ color: "#38bdf8" }}>{coin || "Asset"}</span>
        </h2>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", borderBottom: "1px solid rgba(148,163,184,0.1)" }}>
          <span style={{ color: "#94a3b8" }}>Capital at Risk</span>
          <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#f87171" }}>${riskAmount.toFixed(2)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", borderBottom: "1px solid rgba(148,163,184,0.1)" }}>
          <span style={{ color: "#94a3b8" }}>Position Size (USD)</span>
          <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#f8fafc" }}>${positionSizeUsd.toFixed(2)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", borderBottom: "1px solid rgba(148,163,184,0.1)" }}>
          <span style={{ color: "#94a3b8" }}>Quantity to Buy</span>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#38bdf8", fontFamily: "monospace" }}>{qty > 0 ? qty.toFixed(6) : "0.00"}</span>
            <span style={{ display: "block", fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>@ {livePrice ? `$${livePrice.toFixed(4)}` : "Loading..."}</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: minRequiredLeverage > parseFloat(maxLeverage) ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)", borderRadius: "8px" }}>
          <span style={{ color: "#cbd5e1" }}>Min. Leverage Required</span>
          <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: minRequiredLeverage > parseFloat(maxLeverage) ? "#f87171" : "#10b981" }}>
            {minRequiredLeverage.toFixed(2)}x
          </span>
        </div>
        
        {minRequiredLeverage > parseFloat(maxLeverage) && (
          <div style={{ fontSize: "0.85rem", color: "#f87171", textAlign: "center" }}>
            Warning: Required leverage exceeds your maximum allowed leverage. Reduce risk or widen Stop Loss.
          </div>
        )}

      </div>
    </div>
  );
}
