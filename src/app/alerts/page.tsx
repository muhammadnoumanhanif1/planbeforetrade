"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase-client";
import { Navigation } from "@/components/Navigation";
import { hasPremiumAccess, isTemporaryPublicAccessEnabled } from "@/lib/auth-access";
import styles from "../page.module.css";

type Alert = {
  id: string;
  exchange: "bitget" | "binance" | "mexc";
  symbol: string;
  condition: "above" | "below";
  target_price: number;
  is_active: boolean;
  created_at: string;
};

export default function AlertsPage() {
  const isTemporaryPublicAccess = isTemporaryPublicAccessEnabled();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [coins, setCoins] = useState<Array<{ symbol: string; displaySymbol: string; lastPrice: number }>>([]);
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [form, setForm] = useState({
    exchange: "binance",
    symbol: "",
    currentPrice: "",
    condition: "above",
    targetPrice: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!isTemporaryPublicAccess) {
          window.location.href = "/login";
          return;
        }
        setIsPremium(false);
        setAlerts([]);
        return;
      }

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!hasPremiumAccess(subscription)) {
        setIsPremium(false);
        setAlerts([]);
        return;
      }
      setIsPremium(true);

      // Load coins
      setLoadingCoins(true);
      const coinsResponse = await fetch(`/api/coins?exchange=${encodeURIComponent(form.exchange)}`);
      const coinsPayload = await coinsResponse.json();
      if (coinsResponse.ok) {
        setCoins(coinsPayload?.coins ?? []);
      }
      setLoadingCoins(false);

      const response = await fetch("/api/alerts");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to fetch alerts");
      setAlerts(payload.alerts ?? []);
    } catch (error) {
      setMessage({ type: "error", text: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }, [form.exchange, isTemporaryPublicAccess]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exchange: form.exchange,
          symbol: form.symbol.trim().toUpperCase(),
          condition: form.condition,
          targetPrice: Number(form.targetPrice),
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to create alert");
      setAlerts((prev) => [payload.alert, ...prev]);
      setForm((prev) => ({ ...prev, symbol: "", currentPrice: "", targetPrice: "" }));
      setMessage({ type: "success", text: "Alert created." });
    } catch (error) {
      setMessage({ type: "error", text: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (alert: Alert) => {
    setMessage(null);
    try {
      const response = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id, isActive: !alert.is_active }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to update alert");
      setAlerts((prev) => prev.map((item) => (item.id === alert.id ? payload.alert : item)));
    } catch (error) {
      setMessage({ type: "error", text: (error as Error).message });
    }
  };

  const deleteAlert = async (id: string) => {
    setMessage(null);
    try {
      const response = await fetch(`/api/alerts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to delete alert");
      setAlerts((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      setMessage({ type: "error", text: (error as Error).message });
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <main className={styles.main} />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.card}>
            <h2>Premium Feature</h2>
            <p style={{ color: "#94a3b8", marginBottom: 16 }}>
              Price alerts are available on Premium plans.
            </p>
            <Link href="/pricing" className={styles.button} style={{ textDecoration: "none", textAlign: "center" }}>
              Upgrade to Premium
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
<div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>PRICE ALERTS</h1>
            </div>
          </div>
        </header>

        <Navigation />

        {message && <div className={message.type === "success" ? styles.success : styles.error}>{message.text}</div>}

        <section className={styles.grid}>
          <div className={styles.card}>
            <h2>Create Alert</h2>
            <form onSubmit={onSubmit} className={styles.profileForm}>
              <label className={styles.label}>
                Exchange
                <select
                  className={styles.input}
                  value={form.exchange}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, exchange: event.target.value, symbol: "" }));
                    loadData();
                  }}
                >
                  <option value="binance">Binance</option>
                  <option value="bitget">Bitget</option>
                  <option value="mexc">MEXC</option>
                </select>
              </label>
              <label className={styles.label}>
                Symbol
                <select
                  className={styles.input}
                  value={form.symbol}
                  onChange={(event) => {
                    const symbol = event.target.value;
                    const coin = coins.find((c) => c.symbol === symbol);
                    setForm((prev) => ({
                      ...prev,
                      symbol: symbol,
                      currentPrice: coin ? coin.lastPrice.toString() : "",
                    }));
                  }}
                  disabled={loadingCoins}
                >
                  <option value="">Choose a coin</option>
                  {coins.map((coin) => (
                    <option key={coin.symbol} value={coin.symbol}>
                      {coin.displaySymbol}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                Manual symbol
                <input
                  className={styles.input}
                  value={form.symbol}
                  onChange={(event) => {
                    const symbol = event.target.value.trim().toUpperCase();
                    const coin = coins.find((c) => c.symbol === symbol);
                    setForm((prev) => ({
                      ...prev,
                      symbol,
                      currentPrice: coin ? coin.lastPrice.toString() : "",
                    }));
                  }}
                  placeholder="Type coin symbol, e.g. BTCUSDT"
                  autoCapitalize="characters"
                />
              </label>
              {form.currentPrice && (
                <div style={{ marginBottom: 16, padding: "8px 12px", backgroundColor: "rgba(52, 168, 83, 0.1)", borderRadius: 4 }}>
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Current Price</p>
                  <p style={{ fontSize: 18, fontWeight: "bold", color: "#34a853", margin: 0 }}>
                    {Number(form.currentPrice).toFixed(6)} USDT
                  </p>
                </div>
              )}
              <label className={styles.label}>
                Condition
                <select
                  className={styles.input}
                  value={form.condition}
                  onChange={(event) => setForm((prev) => ({ ...prev, condition: event.target.value }))}
                >
                  <option value="above">Price goes above</option>
                  <option value="below">Price goes below</option>
                </select>
              </label>
              <label className={styles.label}>
                Target Price
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  className={styles.input}
                  value={form.targetPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, targetPrice: event.target.value }))}
                  required
                />
              </label>
              <button className={styles.button} type="submit" disabled={saving || !form.symbol}>
                {saving ? "Creating..." : "Create Alert"}
              </button>
            </form>
          </div>

          <div className={styles.card}>
            <h2>Your Alerts</h2>
            {alerts.length === 0 ? (
              <p className={styles.placeholder}>No alerts yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      {alert.exchange.toUpperCase()} {alert.symbol}
                    </p>
                    <p style={{ margin: "8px 0", color: "#94a3b8", fontSize: 13 }}>
                      Trigger when price is <strong>{alert.condition}</strong> {alert.target_price}
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className={styles.navLink}
                        onClick={() => toggleActive(alert)}
                        style={{ border: "none", cursor: "pointer" }}
                      >
                        {alert.is_active ? "Pause" : "Activate"}
                      </button>
                      <button
                        type="button"
                        className={styles.logoutButton}
                        onClick={() => deleteAlert(alert.id)}
                        style={{ width: "auto", padding: "8px 12px", fontSize: 14 }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
