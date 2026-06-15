import { NextResponse } from "next/server";
import { createAdminClient, createServerClient } from "@/lib/supabase-server";

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (user.app_metadata?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user };
}

export async function DELETE(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const body = await request.json();
    const id = normalizeOptionalText(body?.id);

    if (!id) {
      return NextResponse.json({ error: "Post id is required." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: existing, error: existingError } = await adminClient
      .from("blog_posts")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: "Failed to fetch post." }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    const { error: deleteError } = await adminClient.from("blog_posts").delete().eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete post." }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[blog-delete] unexpected error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
