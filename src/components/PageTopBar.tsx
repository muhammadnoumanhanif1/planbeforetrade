"use client";

import { usePathname } from "next/navigation";

function formatPath(pathname: string) {
  if (pathname === "/") {
    return "Home";
  }

  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] ?? "";
  return lastSegment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PageTopBar() {
  const pathname = usePathname();
  const pageLabel = formatPath(pathname ?? "/");

  return (
    <div
      style={{
        padding: "12px 16px",
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 13,
        color: "rgb(148, 163, 184)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <img src="/logo.png" alt="Plan Before Trade" style={{ width: 20, height: 20, objectFit: "contain" }} />
        <span style={{ fontWeight: 600, color: "white" }}>Plan Before Trade</span>
      </div>
      <div>{pageLabel}</div>
    </div>
  );
}