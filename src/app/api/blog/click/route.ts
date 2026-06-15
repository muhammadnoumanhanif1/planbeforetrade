import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const slug = normalizeOptionalText(body?.slug).toLowerCase();
    const postId = normalizeOptionalText(body?.postId);

    if (!slug && !postId) {
      return NextResponse.json({ error: "slug or postId is required." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = postId
      ? await adminClient.rpc("track_blog_post_click_by_id", { target_post_id: postId })
      : await adminClient.rpc("track_blog_post_click_by_slug", { post_slug: slug });

    if (error) {
      return NextResponse.json({ error: "Failed to track click." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
