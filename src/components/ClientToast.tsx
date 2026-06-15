"use client";

import { useEffect, useState } from "react";

type ClientToastProps = {
  message: string;
  durationMs?: number;
};

export function ClientToast({ message, durationMs = 2800 }: ClientToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs]);

  if (!visible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 60,
        background: "rgba(15, 23, 42, 0.96)",
        border: "1px solid rgba(34, 197, 94, 0.5)",
        color: "#bbf7d0",
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 10px 30px rgba(2, 6, 23, 0.45)",
        maxWidth: 320,
      }}
    >
      {message}
    </div>
  );
}
