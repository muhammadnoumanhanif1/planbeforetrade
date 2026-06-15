"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase-client";
import { signOut } from "@/lib/supabase-client";
import { hasPremiumAccess } from "@/lib/auth-access";
import styles from "@/app/page.module.css";

export function Navigation() {
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInitial, setUserInitial] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);
        setUserInitial(user.email?.[0].toUpperCase() || "U");
        setIsAdmin(user.app_metadata?.role === "admin");

        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        setIsPremium(hasPremiumAccess(subscription));
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut();
    window.location.href = "/login";
  }, []);

  const isActive = (href: string) => pathname === href;

  const navLinkClassName = (href: string) =>
    `${styles.navLink} ${isActive(href) ? styles.navLinkActive : ""}`.trim();

  return (
    <nav
      style={{
        borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
        padding: "12px 20px",
        backgroundColor: "#0f1729",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          maxWidth: "100%",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link href="/dashboard" className={navLinkClassName("/dashboard")}>Dashboard</Link>
          <Link href="/blog" className={navLinkClassName("/blog")}>Blog</Link>
          <Link href="/signals" className={navLinkClassName("/signals")}>Signals</Link>
          <Link href="/signals/history" className={navLinkClassName("/signals/history")}>Signals History</Link>
          <Link href="/market-structure-signals" className={navLinkClassName("/market-structure-signals")}>Smart Signals</Link>
          <Link href="/liquidation-calculator" className={navLinkClassName("/liquidation-calculator")}>Liquidation Calculator</Link>
          {!loading && isAdmin && <Link href="/admin" className={navLinkClassName("/admin")}>Admin</Link>}

          <Link href="/average-calculator" className={navLinkClassName("/average-calculator")}>Average Calculator</Link>
          
          {!loading && isPremium && (
            <>
              <Link href="/watchlists" className={navLinkClassName("/watchlists")}>Watchlists</Link>
              <Link href="/alerts" className={navLinkClassName("/alerts")}>Alerts</Link>
              <Link href="/profile" className={navLinkClassName("/profile")}>Profile</Link>
            </>
          )}

          {!loading && !isPremium && (
            <Link href="/pricing" className={styles.navLink}>
              Upgrade
            </Link>
          )}

        </div>

        {loading ? null : isAuthenticated ? (
          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
          >
            Logout
          </button>
        ) : (
          <Link href="/login" className={styles.navLink}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
