"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/error-monitoring";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    reportError(error, { digest: error.digest, scope: "global-error-boundary" });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          margin: 0,
          display: "grid",
          placeItems: "center",
          background: "#05070f",
          color: "#e5e7eb",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: 560, textAlign: "center" }}>
          <h1>Something went wrong</h1>
          <p style={{ color: "#94a3b8" }}>
            We logged this issue. Please try again, and if it persists, contact support.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              marginTop: 12,
              border: "none",
              borderRadius: 10,
              padding: "12px 18px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
