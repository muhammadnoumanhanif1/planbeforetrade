"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase-client";
import styles from "../../page.module.css";

const MIN_PASSWORD_LENGTH = 8;
const INVALID_RESET_LINK_ERROR = "Invalid or expired reset link. Please request a new one.";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    let isMounted = true;

    const initialize = async () => {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      const hasRecoveryType =
        url.searchParams.get("type") === "recovery" ||
        hashParams.get("type") === "recovery";
      const code = url.searchParams.get("code");
      const hasCode = !!code;
      const tokenHash = url.searchParams.get("token_hash");
      const hasTokenHash = !!tokenHash;
      const hasAccessToken = !!hashParams.get("access_token");
      const recoverySignal = hasRecoveryType || hasCode || hasTokenHash || hasAccessToken;

      setIsRecoveryFlow(recoverySignal);

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (!isMounted) return;

        if (exchangeError) {
          setError(INVALID_RESET_LINK_ERROR);
          return;
        }
      } else if (hasRecoveryType && tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });

        if (!isMounted) return;

        if (verifyError) {
          setError(INVALID_RESET_LINK_ERROR);
          return;
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (sessionError) {
        setError(INVALID_RESET_LINK_ERROR);
        return;
      }

      if (data.session && recoverySignal) {
        setCanReset(true);
      } else {
        setError(INVALID_RESET_LINK_ERROR);
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setCanReset(true);
        setIsRecoveryFlow(true);
        setError("");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!success) return;
    const timeoutId = window.setTimeout(() => {
      router.push("/login");
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [success, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!canReset || !isRecoveryFlow) {
      setError(INVALID_RESET_LINK_ERROR);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("Password updated successfully. Redirecting to login in a few seconds...");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.loginContainer}>
          <div className={styles.loginCard}>
            <div className={styles.loginHeader}>
              <p className={styles.loginBrandBlue}>Plan Before</p>
              <p className={styles.loginBrandGreen}>Trade</p>
              <h1>Set New Password</h1>
            </div>

            <p style={{ color: "#94a3b8", textAlign: "center", marginBottom: "24px" }}>
              Enter your new password to complete the reset process.
            </p>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}
            {error?.includes(INVALID_RESET_LINK_ERROR) && (
              <p className={styles.signupPrompt}>
                Need a fresh link?{" "}
                <Link href="/forgot-password" className={styles.link}>
                  Request a new reset email
                </Link>
              </p>
            )}

            <form onSubmit={handleSubmit} className={styles.loginForm}>
              <label className={styles.label}>
                New Password
                <input
                  className={styles.input}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  required
                  autoComplete="new-password"
                  disabled={loading || !!success}
                />
              </label>

              <label className={styles.label}>
                Confirm New Password
                <input
                  className={styles.input}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  autoComplete="new-password"
                  disabled={loading || !!success}
                />
              </label>

              <button
                type="submit"
                className={styles.button}
                disabled={loading || !!success || !newPassword || !confirmPassword}
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>

            <p className={styles.signupPrompt}>
              Back to{" "}
              <Link href="/login" className={styles.link}>
                Login
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
