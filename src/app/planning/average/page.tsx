"use client";

import { useState } from "react";
import styles from "@/app/page.module.css";
import { usePlanningContext } from "../context";

interface EntryRow {
  id: number;
  price: string;
  qty: string;
}

export default function AveragePage() {
  const { coin, livePrice } = usePlanningContext();

  const [rows, setRows] = useState<EntryRow[]>([
    { id: Date.now(), price: "", qty: "" }
  ]);

  const addRow = () => {
    setRows([...rows, { id: Date.now(), price: "", qty: "" }]);
  };

  const addLiveRow = () => {
    if (livePrice) {
      setRows([...rows, { id: Date.now(), price: livePrice.toString(), qty: "" }]);
    }
  };

  const removeRow = (id: number) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const updateRow = (id: number, field: keyof EntryRow, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  let totalValue = 0;
  let totalQty = 0;

  rows.forEach(row => {
    const p = parseFloat(row.price) || 0;
    const q = parseFloat(row.qty) || 0;
    if (p > 0 && q > 0) {
      totalValue += p * q;
      totalQty += q;
    }
  });

  const averagePrice = totalQty > 0 ? totalValue / totalQty : 0;
  
  // Calculate percentage diff from current price to average
  let diffFromLive = 0;
  if (livePrice && livePrice > 0 && averagePrice > 0) {
    diffFromLive = ((averagePrice - livePrice) / livePrice) * 100;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
      
      {/* Input Section */}
      <div className={styles.glassCard} style={{ padding: "30px", background: "rgba(15, 23, 42, 0.7)" }}>
        <h2 className={styles.gradientText} style={{ fontSize: "1.5rem", margin: "0 0 24px 0", borderBottom: "1px solid rgba(148,163,184,0.1)", paddingBottom: "12px" }}>
          DCA Builder
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Header Row */}
          <div style={{ display: "flex", gap: "12px", padding: "0 4px" }}>
            <div style={{ flex: 1, fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Entry Price</div>
            <div style={{ flex: 1, fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Quantity</div>
            <div style={{ width: "36px" }}></div>
          </div>

          {/* Input Rows */}
          {rows.map((row, index) => (
            <div key={row.id} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: "absolute", left: "12px", top: "12px", color: "#64748b", fontSize: "0.8rem", fontWeight: "bold" }}>#{index+1}</span>
                <input 
                  type="number" 
                  className={styles.inputField}
                  value={row.price}
                  onChange={(e) => updateRow(row.id, "price", e.target.value)}
                  placeholder="0.00"
                  step="any"
                  style={{ width: "100%", padding: "12px 12px 12px 36px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)", color: "#f8fafc" }}
                />
              </div>
              <input 
                type="number" 
                className={styles.inputField}
                value={row.qty}
                onChange={(e) => updateRow(row.id, "qty", e.target.value)}
                placeholder="0.00"
                step="any"
                style={{ flex: 1, padding: "12px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)", color: "#f8fafc" }}
              />
              <button 
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
                style={{ 
                  width: "36px", height: "36px", borderRadius: "8px", 
                  background: rows.length > 1 ? "rgba(239, 68, 68, 0.1)" : "transparent", 
                  color: rows.length > 1 ? "#ef4444" : "#334155",
                  border: rows.length > 1 ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(148, 163, 184, 0.1)", 
                  cursor: rows.length > 1 ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s"
                }}
              >
                ✕
              </button>
            </div>
          ))}

          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button 
              onClick={addRow}
              style={{ 
                flex: 1, padding: "12px", borderRadius: "8px", 
                background: "rgba(56, 189, 248, 0.05)", color: "#38bdf8",
                border: "1px dashed rgba(56, 189, 248, 0.4)", cursor: "pointer",
                fontWeight: "bold", transition: "all 0.2s"
              }}
            >
              + Empty Tier
            </button>
            <button 
              onClick={addLiveRow}
              disabled={!livePrice}
              style={{ 
                flex: 1, padding: "12px", borderRadius: "8px", 
                background: !livePrice ? "rgba(16, 185, 129, 0.05)" : "rgba(16, 185, 129, 0.15)", 
                color: !livePrice ? "#64748b" : "#10b981",
                border: `1px solid ${!livePrice ? "rgba(148, 163, 184, 0.1)" : "rgba(16, 185, 129, 0.3)"}`, 
                cursor: !livePrice ? "not-allowed" : "pointer",
                fontWeight: "bold", transition: "all 0.2s"
              }}
            >
              + Live Price Tier
            </button>
          </div>

        </div>
      </div>

      {/* Output Section */}
      <div className={styles.glassCard} style={{ padding: "30px", background: "rgba(15, 23, 42, 0.9)", display: "flex", flexDirection: "column", gap: "20px" }}>
        <h2 style={{ fontSize: "1.2rem", margin: "0", color: "#cbd5e1" }}>
          DCA Summary for <span style={{ color: "#38bdf8" }}>{coin || "Asset"}</span>
        </h2>
        
        <div style={{ padding: "20px", background: "linear-gradient(145deg, rgba(56, 189, 248, 0.1), rgba(99, 102, 241, 0.1))", borderRadius: "12px", border: "1px solid rgba(56, 189, 248, 0.3)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ color: "#94a3b8", fontSize: "0.9rem", fontWeight: "bold" }}>Blended Average Entry</span>
          <span style={{ fontSize: "2rem", fontWeight: "bold", color: "#f8fafc", fontFamily: "monospace" }}>
            ${averagePrice > 0 ? averagePrice.toFixed(4) : "0.0000"}
          </span>
          {averagePrice > 0 && livePrice && (
            <span style={{ fontSize: "0.9rem", color: diffFromLive > 0 ? "#f87171" : "#10b981" }}>
              {Math.abs(diffFromLive).toFixed(2)}% {diffFromLive > 0 ? "above" : "below"} current live price
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "10px" }}>
          <div style={{ padding: "16px", background: "rgba(30, 41, 59, 0.5)", borderRadius: "8px", border: "1px solid rgba(148, 163, 184, 0.1)" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "4px" }}>Total Volume (Coins)</span>
            <span style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#38bdf8", fontFamily: "monospace" }}>
              {totalQty.toFixed(4)}
            </span>
          </div>

          <div style={{ padding: "16px", background: "rgba(30, 41, 59, 0.5)", borderRadius: "8px", border: "1px solid rgba(148, 163, 184, 0.1)" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "4px" }}>Total Capital (USD)</span>
            <span style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#e2e8f0", fontFamily: "monospace" }}>
              ${totalValue.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
