"use client";

import { FormEvent, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase-client";
import { isTemporaryPublicAccessEnabled } from "@/lib/auth-access";
import styles from "../page.module.css";


export default function OnboardingPage() {
  const isTemporaryPublicAccess = isTemporaryPublicAccessEnabled();
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!isTemporaryPublicAccess) {
          window.location.href = "/login";
          return;
        }
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("full_name, country").eq("id", user.id).single();
      if (profile?.full_name) {
        window.location.href = "/dashboard";
        return;
      }

      setFullName(profile?.full_name ?? user.user_metadata?.full_name ?? "");
      setCountry(profile?.country ?? "");
      setLoading(false);
    };

    loadUser();
  }, [isTemporaryPublicAccess]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");
      if (!fullName.trim()) throw new Error("Full name is required");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          country: country.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;
      window.location.href = "/dashboard";
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.placeholder}>Preparing onboarding...</p>
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
              <h1>WELCOME</h1>
              <p className={styles.subtitle}>Set up your profile to start using your dashboard.</p>
            </div>
          </div>
        </header>

        <section className={styles.profileSection}>
          <div className={styles.profileCard}>
            <h2>Tell us about you</h2>
            {error && <div className={styles.error}>{error}</div>}
            <form onSubmit={handleSubmit} className={styles.profileForm}>
              <label className={styles.label}>
                Full Name
                <input
                  className={styles.input}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your full name"
                  required
                />
              </label>

              <label className={styles.label}>
                Country
                <input
                  className={styles.input}
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  placeholder="Pakistan, UAE, UK..."
                />
              </label>

              <button type="submit" className={styles.button} disabled={saving}>
                {saving ? "Saving..." : "Continue to Dashboard"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
