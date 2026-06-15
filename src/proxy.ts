import { NextRequest, NextResponse } from "next/server";
import { updateSession, isProtectedRoute, isAuthRoute } from "@/lib/supabase-middleware";
import { isTemporaryPublicAccessEnabled } from "@/lib/auth-access";

// Legacy auth check (for transition period)
const LEGACY_AUTH_COOKIE = "pbt_session";

function isLegacyAuthConfigured() {
  return !!(
    process.env.AUTH_USERNAME &&
    process.env.AUTH_PASSWORD &&
    process.env.AUTH_SESSION_SECRET
  );
}

function isSupabaseConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isCronAuthorized(request: NextRequest, hasUser: boolean): boolean {
  if (hasUser) return true;

  const bearerToken = parseBearerToken(request.headers.get("authorization"));
  const providedBotKey = request.headers.get("x-bot-key")?.trim() || bearerToken;

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && bearerToken === cronSecret) {
    return true;
  }

  const botSignalsApiKey = process.env.BOT_SIGNALS_API_KEY?.trim();
  if (botSignalsApiKey && providedBotKey === botSignalsApiKey) {
    return true;
  }

  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isTemporaryPublicAccess = isTemporaryPublicAccessEnabled();

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ====================================
  // SUPABASE AUTH (Primary)
  // ====================================
  if (isSupabaseConfigured()) {
    const { supabaseResponse, user } = await updateSession(request);

    // Public marketing pages - always accessible
    if (pathname === "/" || pathname === "/pricing" || pathname === "/faq") {
      return supabaseResponse;
    }

    // API routes for auth - always accessible
    if (pathname.startsWith("/api/auth")) {
      return supabaseResponse;
    }

    // Public analytics ingestion endpoint
    if (pathname === "/api/analytics") {
      return supabaseResponse;
    }

    // AI Learning and Insights endpoints - use server-side admin client
    // These don't require user auth since they use admin credentials server-side
    if (pathname.startsWith("/api/ai-insights") || pathname.startsWith("/api/ai-learning")) {
      return supabaseResponse;
    }

    // Cron endpoints allow session auth or machine auth (Bearer CRON_SECRET / x-bot-key)
    if (pathname.startsWith("/api/cron/")) {
      if (isCronAuthorized(request, !!user)) {
        return supabaseResponse;
      }

      return NextResponse.json(
        { error: "Unauthorized. Provide session auth or Bearer CRON_SECRET." },
        { status: 401 }
      );
    }

    // Monitoring endpoint allows session auth or machine auth (Bearer CRON_SECRET / x-bot-key)
    if (pathname === "/api/trades/active" || pathname === "/api/trades/recent") {
      if (isCronAuthorized(request, !!user)) {
        return supabaseResponse;
      }

      return NextResponse.json(
        { error: "Unauthorized. Provide session auth or Bearer CRON_SECRET." },
        { status: 401 }
      );
    }

    // Bot signal endpoint allows API key auth or logged-in user auth
    if (pathname.startsWith("/api/signals")) {
      const requiredBotKey = process.env.BOT_SIGNALS_API_KEY?.trim();
      const providedBotKey =
        request.headers.get("x-bot-key")?.trim() ||
        parseBearerToken(request.headers.get("authorization"));

      if (user) {
        return supabaseResponse;
      }

      if (requiredBotKey && providedBotKey === requiredBotKey) {
        return supabaseResponse;
      }

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auth pages (login, signup) - redirect to dashboard if logged in
    if (isAuthRoute(pathname)) {
      if (user && !isTemporaryPublicAccess) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return supabaseResponse;
    }

    // API routes - require auth
    if (pathname.startsWith("/api/")) {
      if (!user && !isTemporaryPublicAccess) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }


    // Protected pages - require auth unless temporary public mode is enabled
    if (isProtectedRoute(pathname) && !isTemporaryPublicAccess && !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return supabaseResponse;
  }

  // ====================================
  // LEGACY AUTH (Fallback during transition)
  // ====================================
  if (isLegacyAuthConfigured()) {
    if (isTemporaryPublicAccess) {
      return NextResponse.next();
    }

    const publicRoutes = ["/login", "/api/auth/login", "/api/auth/logout"];

    if (publicRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    const sessionCookie = request.cookies.get(LEGACY_AUTH_COOKIE);
    if (!sessionCookie?.value) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // ====================================
  // NO AUTH CONFIGURED (Dev mode)
  // ====================================
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
