import sanitizeHtml from "sanitize-html";

const MAX_SLUG_LENGTH = 120;
const DEFAULT_EXCERPT_LENGTH = 180;
const MIN_EXCERPT_WORD_BOUNDARY = 50;
export const BLOG_CONTENT_MAX_WIDTH = 1170; // Increased 1.5x from 780

export function slugifyTitle(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const slug = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return slug || "post";
}

export function normalizeSlug(value: string): string {
  return slugifyTitle(value);
}

export function sanitizeBlogHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "s",
      "u",
      "blockquote",
      "pre",
      "code",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "a",
      "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
  });
}

export function stripHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();
}

export function buildExcerptFromHtml(content: string, maxLength = DEFAULT_EXCERPT_LENGTH): string {
  const plain = stripHtml(content);

  if (plain.length <= maxLength) {
    return plain;
  }

  const sliced = plain.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");
  const safeSlice = lastSpace > MIN_EXCERPT_WORD_BOUNDARY ? sliced.slice(0, lastSpace) : sliced;
  return `${safeSlice.trim()}…`;
}

export function parseTags(tagsInput: string): string[] {
  if (!tagsInput.trim()) {
    return [];
  }

  return normalizeTags(tagsInput.split(","));
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawTag of tags) {
    const tag = rawTag.trim().toLowerCase().replace(/[^a-z0-9\s-]+/g, "").replace(/\s+/g, "-");

    if (!tag || seen.has(tag)) {
      continue;
    }

    seen.add(tag);
    normalized.push(tag);

    if (normalized.length >= 20) {
      break;
    }
  }

  return normalized;
}
