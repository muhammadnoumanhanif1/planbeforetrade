export const BLOG_IMAGE_ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg"] as const;
export const BLOG_IMAGE_MAX_SIZE_BYTES = 4 * 1024 * 1024;
export const BLOG_IMAGE_MAX_SIZE_LABEL = "4MB";

export function isAllowedBlogImageType(type: string) {
  return BLOG_IMAGE_ALLOWED_MIME_TYPES.includes(type as (typeof BLOG_IMAGE_ALLOWED_MIME_TYPES)[number]);
}

export function getBlogImageExtension(type: string) {
  if (type === "image/jpeg" || type === "image/jpg") {
    return "jpg";
  }

  return "png";
}
