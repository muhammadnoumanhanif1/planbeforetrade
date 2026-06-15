import Link from "next/link";
import type { Metadata } from "next";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "Sitemap | Plan Before Trade",
  description: "Browse all important pages available in the Plan Before Trade web app.",
};

const SITEMAP_PAGES = [
  { href: "/sitemap.xml", label: "Sitemap XML (Google Search Console)" },
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
  { href: "/contact-us", label: "Contact Us" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/login", label: "Login" },
  { href: "/signup", label: "Sign Up" },
];

export default function SitemapPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
            <h1>SITEMAP</h1>
            <p className={styles.subtitle}>Find key public pages of the web app in one place.</p>
            </div>
          </div>
        </header>

        <section style={{ maxWidth: 860, margin: "0 auto" }}>
          <article className={styles.card} style={{ padding: 20, borderRadius: 12, boxShadow: "none" }}>
            <h2 style={{ marginTop: 0, marginBottom: 16, background: "transparent", color: "#e2e8f0", padding: 0 }}>
              Page Name
            </h2>
            <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {SITEMAP_PAGES.map((page) => (
                <li key={page.href}>
                  <Link href={page.href}>
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}
