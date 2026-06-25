"use client";

import { useState } from "react";
import styles from "@/app/page.module.css";
import { usePlanningContext } from "../context";

export default function SuggestionPage() {
  const { coin, exchange, livePrice } = usePlanningContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestion = async () => {
    if (!coin) return;
    setLoading(true);
    setError(null);
    setSuggestion(null);
    
    try {
      const symbolToFetch = coin.toUpperCase().endsWith("USDT") ? coin.toUpperCase() : `${coin.toUpperCase()}USDT`;
      const res = await fetch(`/api/analysis?exchange=${exchange}&symbol=${symbolToFetch}&timeframe=1h`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch analysis");
      }

      setSuggestion({
        sentiment: data.recommendation === "LONG" ? "Bullish" : "Bearish",
        confidence: data.confidence,
        keyLevels: {
          support: data.support,
          resistance: data.resistance,
        },
        analysis: data.notes?.join(" ") || `Based on recent market structure and volume profiles on ${exchange.toUpperCase()}, the AI models indicate a ${data.recommendation} signal with a predicted price target of $${data.predictedPrice?.toFixed(4) || "N/A"}.`
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
      
      <div className={styles.glassCard} style={{ padding: "30px", background: "rgba(15, 23, 42, 0.7)" }}>
        <h2 className={styles.gradientText} style={{ fontSize: "1.5rem", margin: "0 0 24px 0", borderBottom: "1px solid rgba(148,163,184,0.1)", paddingBottom: "12px" }}>
          AI Market Bias
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{ padding: "20px", background: "rgba(15, 23, 42, 0.4)", borderRadius: "12px", border: "1px solid rgba(148, 163, 184, 0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "4px" }}>Target Asset</span>
              <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#f8fafc" }}>{coin || "---"}</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "4px" }}>Live Price</span>
              <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#10b981", fontFamily: "monospace" }}>{livePrice ? `$${livePrice.toFixed(4)}` : "---"}</span>
            </div>
          </div>

          <button 
            onClick={fetchSuggestion}
            disabled={!coin || loading}
            style={{ 
              padding: "16px", borderRadius: "8px", fontWeight: "bold", fontSize: "1.1rem",
              background: (!coin || loading) ? "rgba(59, 130, 246, 0.3)" : "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
              color: "white", border: "none", cursor: (!coin || loading) ? "not-allowed" : "pointer",
              transition: "all 0.2s"
            }}
          >
            {loading ? "Running AI Models..." : "Generate AI Bias"}
          </button>

          {/* Error Message */}
          {error && (
            <div style={{ padding: "16px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444" }}>
              {error}
            </div>
          )}

          {/* Suggestion Result */}
          {suggestion && !error && (
            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "20px", animation: "fadeIn 0.5s ease-in-out" }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ padding: "20px", background: "rgba(30, 41, 59, 0.5)", borderRadius: "12px", border: "1px solid rgba(148, 163, 184, 0.1)" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>Sentiment</span>
                  <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: suggestion.sentiment === "Bullish" ? "#10b981" : "#ef4444" }}>
                    {suggestion.sentiment}
                  </span>
                </div>
                <div style={{ padding: "20px", background: "rgba(30, 41, 59, 0.5)", borderRadius: "12px", border: "1px solid rgba(148, 163, 184, 0.1)" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>Confidence Score</span>
                  <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#38bdf8", fontFamily: "monospace" }}>
                    {suggestion.confidence}%
                  </span>
                </div>
              </div>

              <div style={{ padding: "20px", background: "rgba(30, 41, 59, 0.5)", borderRadius: "12px", border: "1px solid rgba(148, 163, 184, 0.1)" }}>
                <h4 style={{ color: "#f8fafc", marginBottom: "16px", fontSize: "1.1rem" }}>Key Market Levels</h4>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid rgba(148,163,184,0.1)" }}>
                  <span style={{ color: "#94a3b8", fontSize: "1rem" }}>Resistance (Supply)</span>
                  <span style={{ color: "#ef4444", fontWeight: "bold", fontSize: "1.1rem", fontFamily: "monospace" }}>${suggestion.keyLevels.resistance?.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8", fontSize: "1rem" }}>Support (Demand)</span>
                  <span style={{ color: "#10b981", fontWeight: "bold", fontSize: "1.1rem", fontFamily: "monospace" }}>${suggestion.keyLevels.support?.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ padding: "24px", background: "linear-gradient(145deg, rgba(56, 189, 248, 0.05), rgba(99, 102, 241, 0.05))", borderRadius: "12px", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                <h4 style={{ color: "#38bdf8", marginBottom: "12px", fontSize: "1.1rem" }}>AI Synthesis</h4>
                <p style={{ color: "#cbd5e1", fontSize: "1rem", lineHeight: "1.7", margin: 0 }}>
                  {suggestion.analysis}
                </p>
              </div>

            </div>
          )}

        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}} />
      </div>
    </div>
  );
}
