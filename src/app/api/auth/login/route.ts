import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  authConfigured,
  createSessionValue,
  validateLogin,
} from "../../../../lib/auth";

export async function POST(request: Request) {
  // If auth is not configured, allow access (dev mode)
  if (!authConfigured()) {
    return NextResponse.json({ success: true });
  }

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (!validateLogin(username, password)) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const sessionValue = createSessionValue(username);
    if (!sessionValue) {
      return NextResponse.json(
        { error: "Session creation failed" },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set(AUTH_COOKIE_NAME, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
