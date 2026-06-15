import Link from "next/link";
import styles from "@/app/page.module.css";

export function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(148, 163, 184, 0.2)",
        padding: "16px 20px",
        backgroundColor: "#0f1729",
        marginTop: "auto",
      }}
    >
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/about" className={styles.navLink}>
          About
        </Link>
        <Link href="/contact-us" className={styles.navLink}>
          Contact
        </Link>
        <Link href="/blog" className={styles.navLink}>
          Blog
        </Link>
        <Link href="/privacy" className={styles.navLink}>
          Privacy
        </Link>
        <Link href="/terms" className={styles.navLink}>
          Terms
        </Link>
        <Link href="/sitemap" className={styles.navLink}>
          Sitemap
        </Link>
      </div>
    </footer>
  );
}
