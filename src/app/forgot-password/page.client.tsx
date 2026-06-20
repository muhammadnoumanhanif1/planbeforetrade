"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/supabase-client";
import styles from "../page.module.css";

const RESEND_COOLDOWN_SECONDS = 60;

const isRateLimitError = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes("rate limit") || normalized.includes("too many requests");
};

const getResetErrorMessage = (message: string) => {
  if (isRateLimitError(message)) {
    return "Too many reset requests. Please wait a minute before trying again.";
  }

  return message;
};


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timerId = window.setInterval(() => {
      setCooldownRemaining((previous) => (previous > 1 ? previous - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [cooldownRemaining]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { error: authError } = await resetPassword(email);

      if (authError) {
        if (isRateLimitError(authError.message)) {
          setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
        }
        setError(getResetErrorMessage(authError.message));
        return;
      }

      setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
      setSuccess("Check your email for a password reset link. The link expires after a short time.");
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
              <h1>Reset Password</h1>
            </div>

            <p style={{ color: "#94a3b8", textAlign: "center", marginBottom: "24px" }}>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            <form onSubmit={handleSubmit} className={styles.loginForm}>
              <label className={styles.label}>
                Email
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </label>

              <button
                type="submit"
                className={styles.button}
                disabled={loading || !email || cooldownRemaining > 0}
              >
                {loading
                  ? "Sending..."
                  : cooldownRemaining > 0
                    ? `Please wait ${cooldownRemaining}s`
                    : success
                      ? "Resend Reset Link"
                      : "Send Reset Link"}
              </button>
            </form>

            <p className={styles.signupPrompt}>
              Remember your password?{" "}
              <Link href="/login" className={styles.link}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
