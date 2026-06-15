"use client";

import { usePWA } from "@/hooks/usePWA";

export function PWAProvider() {
  const { isOnline } = usePWA();

  return (
    <>
      {/* Offline indicator */}
      {!isOnline && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: "#b45309",
            color: "#fef3c7",
            textAlign: "center",
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ⚠️ You are offline — showing cached content
        </div>
      )}
    </>
  );
}
