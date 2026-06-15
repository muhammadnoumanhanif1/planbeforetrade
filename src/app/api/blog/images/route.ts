import { NextResponse } from "next/server";
import { createAdminClient, createServerClient } from "@/lib/supabase-server";
import {
  BLOG_IMAGE_ALLOWED_MIME_TYPES,
  BLOG_IMAGE_MAX_SIZE_BYTES,
  BLOG_IMAGE_MAX_SIZE_LABEL,
  getBlogImageExtension,
  isAllowedBlogImageType,
} from "@/lib/blog-image-upload";

const BLOG_IMAGES_BUCKET = process.env.SUPABASE_BLOG_IMAGES_BUCKET || "blog-images";

function sanitizeFileName(name: string) {
  const trimmed = name.trim().toLowerCase();
  return trimmed
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

async function ensureBlogImageBucket(adminClient: any) {
  const { error: getBucketError } = await adminClient.storage.getBucket(BLOG_IMAGES_BUCKET);

  if (!getBucketError) {
    return;
  }

  const notFound =
    getBucketError.message?.toLowerCase().includes("not found") ||
    getBucketError.message?.toLowerCase().includes("does not exist");

  if (!notFound) {
    throw getBucketError;
  }

  const { error: createBucketError } = await adminClient.storage.createBucket(BLOG_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: BLOG_IMAGE_MAX_SIZE_BYTES,
    allowedMimeTypes: [...BLOG_IMAGE_ALLOWED_MIME_TYPES],
  });

  if (createBucketError && !createBucketError.message?.toLowerCase().includes("already exists")) {
    throw createBucketError;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.app_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    if (!isAllowedBlogImageType(image.type)) {
      return NextResponse.json({ error: "Only PNG and JPG images are allowed." }, { status: 400 });
    }

    if (image.size > BLOG_IMAGE_MAX_SIZE_BYTES) {
      return NextResponse.json({ error: `Image must be ${BLOG_IMAGE_MAX_SIZE_LABEL} or smaller.` }, { status: 400 });
    }

    const adminClient = createAdminClient() as any;

    await ensureBlogImageBucket(adminClient);

    const defaultFileName = `image-${Date.now()}.${getBlogImageExtension(image.type)}`;
    const sanitizedName = sanitizeFileName(image.name) || defaultFileName;
    const path = `${user.id}/${Date.now()}-${sanitizedName}`;

    const { error: uploadError } = await adminClient.storage
      .from(BLOG_IMAGES_BUCKET)
      .upload(path, image, {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[blog-images] upload failed", uploadError);
      return NextResponse.json({ error: "Failed to upload image." }, { status: 500 });
    }

    const { data } = await adminClient.storage.from(BLOG_IMAGES_BUCKET).getPublicUrl(path);

    if (!data?.publicUrl) {
      return NextResponse.json({ error: "Failed to generate image URL." }, { status: 500 });
    }

    return NextResponse.json({ url: data.publicUrl }, { status: 201 });
  } catch (error) {
    console.error("[blog-images] unexpected error", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
