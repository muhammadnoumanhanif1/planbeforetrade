"use client";

/**
 * Supabase Browser Client
 * Use this in Client Components (components with 'use client')
 * 
 * @example
 * import { createBrowserClient } from '@/lib/supabase-client';
 * 
 * function MyComponent() {
 *   const supabase = createBrowserClient();
 *   // Use supabase client...
 * }
 */
import { createBrowserClient as createClient } from "@supabase/ssr";
import { Database } from './supabase-types';

let browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function createBrowserClient() {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

  browserClient = createClient<Database>(
    supabaseUrl,
    supabaseKey
  );

  return browserClient;
}

// Export createClient as alias
export { createBrowserClient as createClient };

// Helper hook for auth state
export async function getSession() {
  const supabase = createBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const supabase = createBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Auth actions
export async function signInWithEmail(email: string, password: string) {
  const supabase = createBrowserClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName?: string,
  country?: string,
  nextPath = "/dashboard"
) {
  const supabase = createBrowserClient();
  const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";
  const callbackUrl = `${getAuthRedirectBaseUrl()}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: {
        full_name: fullName,
        country: country,
      },
    },
  });
}

export async function signInWithGoogle(nextPath = "/dashboard") {
  const supabase = createBrowserClient();
  const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";
  const callbackUrl = `${getAuthRedirectBaseUrl()}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
    },
  });
}

export async function signOut() {
  const supabase = createBrowserClient();
  return supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  const supabase = createBrowserClient();
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAuthRedirectBaseUrl()}/auth/reset-password`,
  });
}

function getAuthRedirectBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (appUrl) {
    try {
      const parsedUrl = new URL(appUrl);
      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        return parsedUrl.origin;
      }
      console.warn(
        `NEXT_PUBLIC_APP_URL uses invalid protocol '${parsedUrl.protocol}'. Expected http: or https:. Falling back to current origin.`
      );
    } catch {
      console.warn(`Invalid NEXT_PUBLIC_APP_URL format: '${appUrl}'. Falling back to current origin.`);
    }
  }

  return window.location.origin;
}
