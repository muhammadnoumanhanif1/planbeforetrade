"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInWithEmail, signInWithGoogle } from "@/lib/supabase-client";
import styles from "../page.module.css";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next") || "/dashboard";
  const safeNext = requestedNext.startsWith("/") ? requestedNext : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: authError } = await signInWithEmail(email, password);

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push(safeNext);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const { error: authError } = await signInWithGoogle(safeNext);
      if (authError) {
        setError(authError.message);
        setLoading(false);
      }
      // Redirect happens automatically via OAuth
    } catch {
      setError("An error occurred with Google sign-in.");
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
              <h1>Sign In</h1>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {/* Google Sign In */}
            <button
              type="button"
              className={styles.googleButton}
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <form onSubmit={handleEmailLogin} className={styles.loginForm}>
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

              <label className={styles.label}>
                Password
                <input
                  className={styles.input}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
              </label>

              <Link href="/forgot-password" className={styles.forgotPassword}>
                Forgot password?
              </Link>

              <button
                type="submit"
                className={styles.button}
                disabled={loading || !email || !password}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className={styles.signupPrompt}>
              Don&apos;t have an account?{" "}
              <Link href={`/signup?next=${encodeURIComponent(safeNext)}`} className={styles.link}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}


export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <main className={styles.main}>
            <div className={styles.loginContainer}>
              <div className={styles.loginCard}>
                <p style={{ textAlign: "center" }}>Loading login...</p>
              </div>
            </div>
          </main>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
