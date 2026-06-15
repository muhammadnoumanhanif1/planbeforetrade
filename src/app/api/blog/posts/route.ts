import { NextResponse } from "next/server";
import { createAdminClient, createServerClient } from "@/lib/supabase-server";
import { buildExcerptFromHtml, normalizeSlug, normalizeTags, sanitizeBlogHtml, slugifyTitle } from "@/lib/blog";

const MAX_SLUG_COLLISION_ATTEMPTS = 100;
type BlogPostSlugRow = { id: string; slug: string | null };

async function resolveUniqueSlug(
  adminClient: ReturnType<typeof createAdminClient>,
  incomingSlug: string,
  excludePostId?: string
) {
  const baseSlug = normalizeSlug(incomingSlug);

  const { data, error } = await adminClient
    .from("blog_posts")
    .select("id,slug")
    .like("slug", `${baseSlug}%`);

  if (error) {
    throw error;
  }

  const existing = new Set(
    (data ?? [])
      .filter((row: BlogPostSlugRow) => !excludePostId || row.id !== excludePostId)
      .map((row: BlogPostSlugRow) => row.slug)
      .filter(Boolean)
  );

  if (!existing.has(baseSlug)) {
    return baseSlug;
  }

  for (let suffix = 2; suffix <= MAX_SLUG_COLLISION_ATTEMPTS + 1; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`;

    if (!existing.has(candidate)) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now()}`;
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

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeFeaturedImage(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeTagsInput(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag));
  }

  if (typeof value === "string") {
    return value.split(",");
  }

  return [];
}

export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const user = adminCheck.user;
    const body = await request.json();
    const title = normalizeOptionalText(body?.title);
    const incomingSlug = normalizeOptionalText(body?.slug);
    const content = normalizeOptionalText(body?.content);
    const tagsInput = normalizeTagsInput(body?.tags);
    const featuredImage = normalizeFeaturedImage(body?.featured_image);
    const excerptInput = normalizeOptionalText(body?.excerpt);

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required." },
        { status: 400 }
      );
    }

    if (title.length > 180) {
      return NextResponse.json({ error: "Title must be 180 characters or fewer." }, { status: 400 });
    }

    const sanitizedContent = sanitizeBlogHtml(content);

    if (!sanitizedContent.trim()) {
      return NextResponse.json({ error: "Content is required." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const slug = await resolveUniqueSlug(adminClient, incomingSlug || slugifyTitle(title));
    const tags = normalizeTags(tagsInput);
    const excerpt = excerptInput || buildExcerptFromHtml(sanitizedContent);

    const { data, error } = await adminClient
      .from("blog_posts")
      .insert({
      title,
      slug,
      content: sanitizedContent,
      excerpt,
      tags,
      featured_image: featuredImage,
      author_id: user.id,
      })
      .select("id,slug")
      .single();

    if (error) {
      console.error("[blog-posts] failed to insert post", error);
      return NextResponse.json(
        { error: "Failed to publish post. Please verify blog table setup and admin permissions." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id, slug: data?.slug ?? slug }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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
      .select("id,title,slug,content,excerpt,tags,featured_image")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: "Failed to fetch post." }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    const title = normalizeOptionalText(body?.title) || existing.title;
    const rawSlug = normalizeOptionalText(body?.slug) || existing.slug;
    const incomingContent = normalizeOptionalText(body?.content);
    const sanitizedContent = incomingContent ? sanitizeBlogHtml(incomingContent) : existing.content;

    if (!title || !sanitizedContent.trim()) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
    }

    const hasTagsField = Object.hasOwn(body ?? {}, "tags");
    const tags = hasTagsField ? normalizeTags(normalizeTagsInput(body?.tags)) : (existing.tags ?? []);
    const featuredImage =
      body?.featured_image === undefined ? existing.featured_image : normalizeFeaturedImage(body?.featured_image);
    const excerptInput = normalizeOptionalText(body?.excerpt);
    const excerpt = excerptInput || buildExcerptFromHtml(sanitizedContent);
    const slug = await resolveUniqueSlug(adminClient, rawSlug || slugifyTitle(title), id);

    const { error: updateError } = await adminClient
      .from("blog_posts")
      .update({
        title,
        slug,
        content: sanitizedContent,
        excerpt,
        tags,
        featured_image: featuredImage,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update post." }, { status: 500 });
    }

    return NextResponse.json({ success: true, id, slug }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const { searchParams } = new URL(request.url);
    const id = normalizeOptionalText(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "Post id is required." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.from("blog_posts").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete post." }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
