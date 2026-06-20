"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient, signOut } from "@/lib/supabase-client";
import { Navigation } from "@/components/Navigation";
import { isTemporaryPublicAccessEnabled } from "@/lib/auth-access";
import styles from "../page.module.css";

interface ProfileData {
  full_name: string;
  email: string;
  avatar_url: string;
  tier: "free" | "premium";
  country: string;
}

interface SubscriptionData {
  plan: string;
  status: string;
  provider: string;
  current_period_end: string | null;
}


export default function ProfilePage() {
  const isTemporaryPublicAccess = isTemporaryPublicAccessEnabled();
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    email: "",
    avatar_url: "",
    tier: "free",
    country: "",
  });
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createBrowserClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!isTemporaryPublicAccess) {
            window.location.href = "/login";
            return;
          }
          return;
        }

        // Get profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile({
            full_name: profileData.full_name || "",
            email: profileData.email || user.email || "",
            avatar_url: profileData.avatar_url || "",
            tier: profileData.tier || "free",
            country: profileData.country || "",
          });
        } else {
          setProfile({
            full_name: user.user_metadata?.full_name || "",
            email: user.email || "",
            avatar_url: user.user_metadata?.avatar_url || "",
            tier: "free",
            country: "",
          });
        }

        // Get subscription
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .single();

        if (subData) {
          setSubscription({
            plan: subData.plan,
            status: subData.status,
            provider: subData.provider,
            current_period_end: subData.current_period_end,
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isTemporaryPublicAccess]);

  const handleSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setMessage({ type: "error", text: "Not authenticated" });
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          country: profile.country,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Profile saved successfully!" });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setSaving(false);
    }
  }, [profile]);

  if (loading) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.placeholder}>Loading profile...</p>
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
            <h1>PROFILE</h1>
            </div>
          </div>
        </header>

        <Navigation />

        <section className={styles.grid}>
          <div className={styles.profileCard}>
            <h2>Your Profile</h2>

            {message && (
              <div className={message.type === "success" ? styles.success : styles.error}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.profileForm}>
              <label className={styles.label}>
                Email
                <input
                  className={styles.input}
                  type="email"
                  value={profile.email}
                  disabled
                  style={{ opacity: 0.6 }}
                />
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Email cannot be changed
                </span>
              </label>

              <label className={styles.label}>
                Full Name
                <input
                  className={styles.input}
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Enter your full name"
                  disabled={saving}
                />
              </label>

              <label className={styles.label}>
                Country
                <input
                  className={styles.input}
                  type="text"
                  value={profile.country}
                  onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                  placeholder="Enter your country"
                  disabled={saving}
                />
              </label>

              <button
                type="submit"
                className={styles.button}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>

          <div className={styles.card}>
            <h2>Subscription</h2>

            {subscription ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <p className={styles.labelText}>Plan</p>
                  <p style={{ color: "#e2e8f0", fontSize: "18px", fontWeight: "600" }}>
                    {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
                  </p>
                </div>
                <div>
                  <p className={styles.labelText}>Provider</p>
                  <p style={{ color: "#94a3b8" }}>
                    {subscription.provider.charAt(0).toUpperCase() + subscription.provider.slice(1)}
                  </p>
                </div>
                <div>
                  <p className={styles.labelText}>Status</p>
                  <span className={`${styles.badge} ${styles.long}`}>
                    {subscription.status.toUpperCase()}
                  </span>
                </div>
                {subscription.current_period_end && (
                  <div>
                    <p className={styles.labelText}>Renews On</p>
                    <p style={{ color: "#94a3b8" }}>
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <Link href="/pricing" className={styles.navLink} style={{ textAlign: "center" }}>
                  Manage Subscription
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <p style={{ color: "#94a3b8" }}>
                  You&apos;re on the free plan with 3 analyses per day.
                </p>
                <div style={{ background: "rgba(56, 189, 248, 0.1)", padding: "16px", borderRadius: "12px" }}>
                  <p style={{ color: "#38bdf8", fontWeight: "600", marginBottom: "8px" }}>
                    Upgrade to Premium
                  </p>
                  <ul style={{ color: "#94a3b8", listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
                    <li>✓ Unlimited analyses</li>
                    <li>✓ Save analyses</li>
                    <li>✓ Watchlists</li>
                    <li>✓ Price alerts</li>
                  </ul>
                </div>
                <Link
                  href="/pricing"
                  className={styles.button}
                  style={{ textDecoration: "none", textAlign: "center" }}
                >
                  View Plans
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className={styles.profileSection} style={{ marginTop: "32px" }}>
          <div className={styles.card} style={{ maxWidth: "500px" }}>
            <h2 style={{ background: "#ef4444" }}>Danger Zone</h2>
            <p style={{ color: "#94a3b8", marginBottom: "16px" }}>
              Permanently delete your account and all associated data.
            </p>
            <Link
              href="/settings"
              className={styles.logoutButton}
              style={{ textDecoration: "none", display: "inline-block", textAlign: "center" }}
            >
              Account Settings
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
