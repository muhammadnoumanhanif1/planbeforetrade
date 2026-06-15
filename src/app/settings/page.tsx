"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { createBrowserClient, signOut } from "@/lib/supabase-client";
import { isTemporaryPublicAccessEnabled } from "@/lib/auth-access";
import styles from "../page.module.css";

export default function SettingsPage() {
  const router = useRouter();
  const isTemporaryPublicAccess = isTemporaryPublicAccessEnabled();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!isTemporaryPublicAccess) {
          router.push("/login");
          return;
        }
        setLoading(false);
        return;
      }
      setEmail(user.email || "");
      setLoading(false);
    };

    loadUser();
  }, [isTemporaryPublicAccess, router]);

  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters" });
      return;
    }

    setChangingPassword(true);

    try {
      const supabase = createBrowserClient();
      
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Password changed successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setChangingPassword(false);
    }
  }, [newPassword, confirmPassword]);

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirm !== "DELETE") {
      setMessage({ type: "error", text: "Please type DELETE to confirm" });
      return;
    }

    setDeleting(true);

    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMessage({ type: "error", text: "Not authenticated" });
        return;
      }

      // Note: To fully delete a user, you need a server-side endpoint
      // that uses the service role key. This just signs them out.
      // The actual deletion should happen via an API endpoint.
      
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
      });

      if (response.ok) {
        await signOut();
        router.push("/");
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to delete account" });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirm, router]);

  const handleLogout = useCallback(async () => {
    await signOut();
    router.push("/login");
  }, [router]);

  if (loading) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.placeholder}>Loading settings...</p>
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
            <h1>SETTINGS</h1>
            </div>
          </div>
          <div className={styles.headerBar}>
            <div className={styles.statusGroup}></div>
            <div className={styles.headerActions}>
              <button type="button" className={styles.logoutButton} onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </header>

        <Navigation />

        {message && (
          <div className={message.type === "success" ? styles.success : styles.error}>
            {message.text}
          </div>
        )}

        <section className={styles.grid}>
          <div className={styles.card}>
            <h2>Change Password</h2>
            <form onSubmit={handleChangePassword} className={styles.profileForm}>
              <label className={styles.label}>
                Email
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  disabled
                  style={{ opacity: 0.6 }}
                />
              </label>

              <label className={styles.label}>
                New Password
                <input
                  className={styles.input}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  disabled={changingPassword}
                  autoComplete="new-password"
                />
              </label>

              <label className={styles.label}>
                Confirm New Password
                <input
                  className={styles.input}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={changingPassword}
                  autoComplete="new-password"
                />
              </label>

              <button
                type="submit"
                className={styles.button}
                disabled={changingPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>

          <div className={styles.card}>
            <h2 style={{ background: "#ef4444" }}>Delete Account</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ color: "#f87171" }}>
                ⚠️ This action is permanent and cannot be undone.
              </p>
              <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                Deleting your account will:
              </p>
              <ul style={{ color: "#94a3b8", fontSize: "14px", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <li>Remove all your saved analyses</li>
                <li>Delete your watchlists and alerts</li>
                <li>Cancel any active subscriptions</li>
                <li>Permanently delete your profile</li>
              </ul>
              
              <label className={styles.label}>
                Type <strong style={{ color: "#ef4444" }}>DELETE</strong> to confirm
                <input
                  className={styles.input}
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="Type DELETE"
                  disabled={deleting}
                  style={{ borderColor: deleteConfirm === "DELETE" ? "#ef4444" : undefined }}
                />
              </label>

              <button
                type="button"
                className={styles.logoutButton}
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== "DELETE"}
                style={{ opacity: deleteConfirm !== "DELETE" ? 0.5 : 1 }}
              >
                {deleting ? "Deleting..." : "Delete My Account"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
