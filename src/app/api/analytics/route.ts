import { NextResponse } from "next/server";

type AnalyticsEvent = {
  type?: "pageview" | "action";
  path?: string;
  referrer?: string;
  ts?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyticsEvent;

    if (!body.type || !body.path) {
      return NextResponse.json({ error: "Invalid analytics payload" }, { status: 400 });
    }

    // Replace with a provider sink later (e.g. PostHog, GA4, Vercel Analytics).
    console.info("[analytics]", {
      type: body.type,
      path: body.path,
      referrer: body.referrer || null,
      ts: body.ts || Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to process analytics event" }, { status: 500 });
  }
}
