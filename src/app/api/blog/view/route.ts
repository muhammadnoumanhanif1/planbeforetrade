import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

function normalizeSlug(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const slug = normalizeSlug(body?.slug);

    if (!slug || slug.length > 180) {
      return NextResponse.json({ error: "Valid slug is required." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient.rpc("track_blog_post_view", {
      post_slug: slug,
    });

    if (error) {
      return NextResponse.json({ error: "Failed to track view." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
