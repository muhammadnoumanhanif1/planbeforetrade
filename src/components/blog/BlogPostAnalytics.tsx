"use client";

import Link from "next/link";
import { MouseEvent, useEffect } from "react";
import styles from "@/app/page.module.css";

type BlogPostAnalyticsProps = {
  slug: string;
  postId: string;
};

const VIEW_KEY_PREFIX = "pbt_blog_viewed";

function sendClickTracking(postId: string, slug: string) {
  const payload = JSON.stringify({ postId, slug });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/blog/click", blob);
    return;
  }

  void fetch("/api/blog/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  });
}

export function BlogPostAnalytics({ slug, postId }: BlogPostAnalyticsProps) {
  useEffect(() => {
    const sessionKey = `${VIEW_KEY_PREFIX}:${slug}`;
    if (sessionStorage.getItem(sessionKey)) {
      return;
    }

    sessionStorage.setItem(sessionKey, "1");
    void fetch("/api/blog/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    });
  }, [slug]);

  const handleCtaClick = (_event: MouseEvent<HTMLAnchorElement>) => {
    sendClickTracking(postId, slug);
  };

  return (
    <section className={styles.card} style={{ marginTop: 16 }}>
      <h2>Take the Next Step</h2>
      <p style={{ color: "#cbd5e1", marginTop: 0 }}>
        Ready to act on these insights? Start with a plan and get structured guidance.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/pricing" className={styles.navLink} onClick={handleCtaClick}>
          Join Now
        </Link>
        <Link href="/signals" className={styles.navLink} onClick={handleCtaClick}>
          Get Signal
        </Link>
      </div>
    </section>
  );
}
