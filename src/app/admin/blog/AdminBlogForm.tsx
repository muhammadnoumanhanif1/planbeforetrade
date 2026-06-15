"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import styles from "../../page.module.css";
import { parseTags, slugifyTitle } from "@/lib/blog";
import {
  BLOG_IMAGE_ALLOWED_MIME_TYPES,
  BLOG_IMAGE_MAX_SIZE_BYTES,
  BLOG_IMAGE_MAX_SIZE_LABEL,
  isAllowedBlogImageType,
} from "@/lib/blog-image-upload";

type AdminBlogFormProps = {
  mode: "create" | "edit";
  initialPost?: {
    id: string;
    title: string;
    slug: string;
    content: string;
    tags: string[] | null;
    featured_image: string | null;
  };
};

export function AdminBlogForm({ mode, initialPost }: AdminBlogFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [slug, setSlug] = useState(initialPost?.slug ?? "");
  const [tagsInput, setTagsInput] = useState((initialPost?.tags ?? []).join(", "));
  const [featuredImage, setFeaturedImage] = useState(initialPost?.featured_image ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false);
  const [error, setError] = useState("");
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const featuredImageInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = mode === "edit";

  const editor = useEditor({
    // TipTap mutates the editor DOM at init time; deferring first render avoids
    // App Router hydration mismatches between server markup and client editor output.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        defaultProtocol: "https",
      }),
      Image,
    ],
    content: initialPost?.content ?? "",
    editorProps: {
      attributes: {
        style:
          "min-height: 260px; border: 1px solid rgba(148,163,184,0.3); border-radius: 10px; padding: 12px; background:#0f172a; color:#e2e8f0;",
      },
    },
  });

  const handleTitleChange = (value: string) => {
    setTitle(value);

    if (!slugTouched) {
      setSlug(slugifyTitle(value));
    }
  };

  const addOrEditLink = () => {
    if (!editor) {
      return;
    }

    const currentHref = editor.getAttributes("link").href as string | undefined;
    const value = window.prompt("Enter link URL", currentHref ?? "https://");

    if (value === null) {
      return;
    }

    const href = value.trim();

    if (!href) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().setLink({ href }).run();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!editor) {
      setError("Editor is still loading. Please try again.");
      return;
    }

    const content = editor.getHTML();

    if (!title.trim() || !slug.trim() || editor.getText().trim().length === 0) {
      setError("Title, slug, and content are required.");
      return;
    }

    setSubmitting(true);

    try {
      const requestPayload = {
        ...(initialPost?.id ? { id: initialPost.id } : {}),
        title,
        slug,
        content,
        tags: parseTags(tagsInput),
        featured_image: featuredImage.trim() || null,
      };

      const response = await fetch(isEditMode ? "/api/blog/update" : "/api/blog/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error || "Failed to publish post.");
        return;
      }

      const nextPath =
        typeof payload?.slug === "string" && payload.slug
          ? isEditMode
            ? `/blog/${payload.slug}?toast=updated`
            : `/blog/${payload.slug}`
          : "/blog";
      router.push(nextPath);
      router.refresh();
    } catch {
      setError(isEditMode ? "Failed to save post." : "Failed to publish post.");
    } finally {
      setSubmitting(false);
    }
  };

  const uploadImage = async (file: File) => {
    if (!isAllowedBlogImageType(file.type)) {
      throw new Error("Only PNG and JPEG images are allowed.");
    }

    if (file.size > BLOG_IMAGE_MAX_SIZE_BYTES) {
      throw new Error(`Image must be ${BLOG_IMAGE_MAX_SIZE_LABEL} or smaller.`);
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/blog/images", {
      method: "POST",
      body: formData,
    });

    let payload: { url?: string; error?: string } = {};
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      payload = await response.json();
    }

    if (!response.ok || typeof payload?.url !== "string") {
      throw new Error(
        payload?.error ||
          (response.status === 413
            ? `Image is too large. Please use an image smaller than ${BLOG_IMAGE_MAX_SIZE_LABEL}.`
            : "Failed to upload image.")
      );
    }

    return payload.url as string;
  };

  const handleInlineImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !editor) {
      return;
    }

    setError("");
    setUploadingInlineImage(true);

    try {
      const url = await uploadImage(file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload image.";
      setError(`Failed to upload inline image. ${message}`);
    } finally {
      setUploadingInlineImage(false);
    }
  };

  const handleFeaturedImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setError("");
    setUploadingFeaturedImage(true);

    try {
      const url = await uploadImage(file);
      setFeaturedImage(url);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload image.";
      setError(`Failed to upload featured image. ${message}`);
    } finally {
      setUploadingFeaturedImage(false);
    }
  };

  const toolbarButtonStyle = { width: "auto", padding: "6px 10px" } as const;
  const tagsPreview = useMemo(() => parseTags(tagsInput), [tagsInput]);

  return (
    <form onSubmit={handleSubmit}>
      <label className={styles.label}>
        Title
        <input
          className={styles.input}
          value={title}
          onChange={(event) => handleTitleChange(event.target.value)}
          maxLength={180}
          required
        />
      </label>

      <label className={styles.label}>
        Slug
        <input
          className={styles.input}
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(slugifyTitle(event.target.value));
          }}
          placeholder="best-crypto-signals-2026"
          required
        />
      </label>

      <label className={styles.label}>
        Tags (comma-separated)
        <input
          className={styles.input}
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="crypto, binance, signals"
        />
      </label>

      <label className={styles.label}>
        Content
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            className={styles.button}
            style={toolbarButtonStyle}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor}
          >
            Bold
          </button>
          <button
            type="button"
            className={styles.button}
            style={toolbarButtonStyle}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!editor}
          >
            Italic
          </button>
          <button
            type="button"
            className={styles.button}
            style={toolbarButtonStyle}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={!editor}
          >
            Heading
          </button>
          <button
            type="button"
            className={styles.button}
            style={toolbarButtonStyle}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={!editor}
          >
            Bullet List
          </button>
          <button
            type="button"
            className={styles.button}
            style={toolbarButtonStyle}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={!editor}
          >
            Numbered List
          </button>
          <button
            type="button"
            className={styles.button}
            style={toolbarButtonStyle}
            onClick={addOrEditLink}
            disabled={!editor}
          >
            Link
          </button>
          <button
            type="button"
            className={styles.button}
            style={toolbarButtonStyle}
            onClick={() => editor?.chain().focus().unsetLink().run()}
            disabled={!editor}
          >
            Unlink
          </button>
          <button
            type="button"
            className={styles.button}
            style={toolbarButtonStyle}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            disabled={!editor}
          >
            Code Block
          </button>
          <button
            type="button"
            className={styles.button}
            style={toolbarButtonStyle}
            onClick={() => inlineImageInputRef.current?.click()}
            disabled={!editor || uploadingInlineImage}
          >
            {uploadingInlineImage ? "Uploading..." : "Insert Image"}
          </button>
          <button
            type="button"
            className={styles.button}
            style={toolbarButtonStyle}
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor}
          >
            Undo
          </button>
          <button
            type="button"
            className={styles.button}
            style={toolbarButtonStyle}
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor}
          >
            Redo
          </button>
        </div>
        <input
          ref={inlineImageInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleInlineImageFileChange}
          style={{ display: "none" }}
        />
        <EditorContent editor={editor} />
      </label>

      <label className={styles.label}>
        Featured Image URL
        <input
          className={styles.input}
          value={featuredImage}
          onChange={(event) => setFeaturedImage(event.target.value)}
          placeholder="https://..."
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className={styles.button}
            style={toolbarButtonStyle}
            onClick={() => featuredImageInputRef.current?.click()}
            disabled={uploadingFeaturedImage}
          >
            {uploadingFeaturedImage ? "Uploading..." : "Upload Featured Image"}
          </button>
          {featuredImage ? (
            <button
              type="button"
              className={styles.button}
              style={toolbarButtonStyle}
              onClick={() => setFeaturedImage("")}
            >
              Remove
            </button>
          ) : null}
        </div>
        <input
          ref={featuredImageInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFeaturedImageFileChange}
          style={{ display: "none" }}
        />
        {featuredImage ? (
          <img
            src={featuredImage}
            alt="Featured preview"
            style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(148,163,184,0.3)" }}
          />
        ) : null}
      </label>

      <p style={{ color: "#94a3b8", marginTop: -6, marginBottom: 16 }}>
        {tagsPreview.length > 0 ? `Parsed tags: ${tagsPreview.map((tag) => `#${tag}`).join(" ")}` : "No tags selected."}
      </p>

      {error ? <p className={styles.error}>{error}</p> : null}

      <button type="submit" className={styles.button} disabled={submitting || !editor}>
        {submitting ? (isEditMode ? "Saving..." : "Publishing...") : isEditMode ? "Save Changes" : "Publish Post"}
      </button>
    </form>
  );
}
