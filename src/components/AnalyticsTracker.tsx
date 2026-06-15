"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const payload = {
      type: "pageview",
      path: pathname || "/",
      referrer: typeof document !== "undefined" ? document.referrer : "",
      ts: Date.now(),
    };

    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Non-blocking analytics.
    });
  }, [pathname]);

  return null;
}
