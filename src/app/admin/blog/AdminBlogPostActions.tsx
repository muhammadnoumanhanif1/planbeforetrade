"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../../page.module.css";

type AdminBlogPostActionsProps = {
  postId: string;
};

export function AdminBlogPostActions({ postId }: AdminBlogPostActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/blog/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: postId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error || "Failed to delete post.");
        return;
      }

      router.push("/admin/blog?toast=deleted");
      router.refresh();
    } catch {
      setError("Failed to delete post.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button type="button" className={styles.button} style={{ width: "auto", padding: "8px 12px" }} onClick={handleDelete} disabled={deleting}>
        {deleting ? "Deleting..." : "Delete"}
      </button>
      {error ? <p className={styles.error} style={{ margin: 0 }}>{error}</p> : null}
    </div>
  );
}
