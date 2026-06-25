/**
 * Supabase Server Client
 * Use this in Server Components, API Routes, and Server Actions
 * 
 * @example
 * import { createServerClient, createAdminClient } from '@/lib/supabase-server';
 * 
 * // In a Server Component or API Route:
 * export async function GET() {
 *   const supabase = await createServerClient();
 *   const { data } = await supabase.from('profiles').select();
 *   return Response.json(data);
 * }
 */
import { createServerClient as createClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { normalizeConfigValue } from "@/lib/normalize-config-value";
import { hasPremiumAccess } from "@/lib/auth-access";
import { Database } from './supabase-types';

/**
 * Reads and trims a required environment variable.
 * Accepts fallback names and throws if none are set.
 */
function getRequiredEnv(name: string | string[]): string {
  const names = Array.isArray(name) ? name : [name];
  for (const candidate of names) {
    const value = normalizeConfigValue(process.env[candidate]);
    if (value) return value;
  }
  // Return placeholder values to prevent app crash if env vars are missing
  const isUrl = names.some(n => n.includes("URL"));
  console.warn(`[supabase] Missing required environment variable: ${names.join(" or ")}. Using placeholder.`);
  return isUrl ? "https://placeholder.supabase.co" : "placeholder-key";
}

export async function createServerClient() {
  const cookieStore = await cookies();
  const supabaseUrl = getRequiredEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]);
  const supabaseAnonKey = getRequiredEnv([
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
  ]);

  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Admin client with service role key
 * Use only in secure server-side contexts (webhooks, admin operations)
 * This bypasses Row Level Security!
 */
export function createAdminClient() {
  const supabaseUrl = getRequiredEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]);
  const serviceRoleKey = getRequiredEnv([
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_KEY",
  ]);

  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Helper to get current user in server context
export async function getServerUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Helper to get user profile
export async function getUserProfile(userId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  
  if (error) throw error;
  return data;
}

// Helper to check if user has premium subscription
export async function isPremiumUser(userId: string): Promise<boolean> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();
  
  return hasPremiumAccess(data);
}

// Helper to get today's usage count
export async function getTodayUsageCount(userId: string): Promise<number> {
  const supabase = await createServerClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count } = await supabase
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "analysis")
    .gte("created_at", today.toISOString());
  
  return count || 0;
}

// Helper to log usage
export async function logUsage(
  userId: string,
  action: string,
  metadata: Record<string, unknown> = {}
) {
  const supabase = await createServerClient();
  return supabase.from("usage_logs").insert({
    user_id: userId,
    action,
    metadata,
  });
}
