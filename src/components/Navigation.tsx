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
        display: "flex",
        justifyContent: "center",
        padding: "16px 20px",
        backgroundColor: "transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          width: "100%",
          maxWidth: "1200px",
          padding: "10px 24px",
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "16px",
          border: "1px solid rgba(148, 163, 184, 0.15)",
          boxShadow: "0 10px 30px -10px rgba(2, 6, 23, 0.5)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <Link href="/dashboard" className={navLinkClassName("/dashboard")}>
            Dashboard
          </Link>
          <Link href="/market-structure-signals" className={navLinkClassName("/market-structure-signals")}>
            Smart Signal
          </Link>
          <Link href="/signals/history" className={navLinkClassName("/signals/history")}>
            Signal History
          </Link>
          <Link href="/signals" className={navLinkClassName("/signals")}>
            Signals
          </Link>
          <Link href="/trading-lists" className={navLinkClassName("/trading-lists")}>
            Trading List
          </Link>
          <Link href="/planning" className={navLinkClassName("/planning")}>
            Planning
          </Link>
          {!loading && isAdmin && (
            <Link href="/admin" className={navLinkClassName("/admin")}>
              Admin
            </Link>
          )}
          {!loading && isPremium && (
            <Link href="/profile" className={navLinkClassName("/profile")}>
              Profile
            </Link>
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
