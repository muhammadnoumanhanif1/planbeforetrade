import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { AdminAccessRestricted } from "@/components/AdminAccessRestricted";
import { createServerClient } from "@/lib/supabase-server";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

const adminActions = [
  {
    title: "Payments Verification",
    description:
      "Review and verify Pakistan and international payment submissions, then activate user packages.",
    href: "/admin/payments",
    ctaLabel: "Open Verification Queue",
    available: true,
  },
  {
    title: "Reply to Queries",
    description:
      "Handle contact-us queries, update statuses, and respond directly from the admin query board.",
    href: "/admin/contact-queries",
    ctaLabel: "Open Contact Queries",
    available: true,
  },
  {
    title: "Blog Post Management",
    description: "Manage blog posts: create, update, and delete posts from the CMS.",
    href: "/admin/blog",
    ctaLabel: "Manage Blog Posts",
    available: true,
  },
  {
    title: "AI Learning Insights",
    description:
      "Review best/worst setups, strategy win rates, and adaptive AI weight changes over time.",
    href: "/admin/ai-insights",
    ctaLabel: "Open AI Insights",
    available: true,
  },
  {
    title: "Backtesting",
    description: "Review backtesting results and strategy performance.",
    href: "/admin/backtesting",
    ctaLabel: "Open Backtesting",
    available: true,
  },
  {
    title: "Package Updates",
    description: "Adjust user package plans and renewals when required by support operations.",
    href: "/admin/payments",
    ctaLabel: "Manage via Payments",
    available: true,
  },
  {
    title: "Telegram Dispatch",
    description:
      "Scan market signals and send Telegram-ready alerts directly to the configured channel.",
    href: "/admin/telegram",
    ctaLabel: "Open Telegram Dispatch",
    available: true,
  },
] as const;

export default async function AdminPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AdminAccessRestricted message="Please sign in with an admin account to access this area." />;
  }

  const isAdmin = user.app_metadata?.role === "admin";

  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
<header className={styles.header}>
            <div className={styles.headerTitleWrapper}>
              <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
              <div>
                <p className={styles.kicker}>Plan Before Trade</p>
                <h1>ADMIN ACCESS DENIED</h1>
              </div>
            </div>
          </header>
          <section className={styles.card}>
            <h2>Access Denied</h2>
            <p style={{ color: "#94a3b8", marginBottom: 16 }}>
              You do not have permission to access the admin dashboard.
            </p>
            <Link href="/dashboard" className={styles.navLink}>
              Back to Dashboard
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
<header className={styles.header}>
          <div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>ADMIN CONTROL PANEL</h1>
              <p className={styles.subtitle}>
                Centralized tools for payment verification, account administration, package updates, and
                support query handling.
              </p>
            </div>
          </div>
        </header>

        <Navigation />

        <section className={styles.grid}>
          {adminActions.map((action) => (
            <article className={styles.card} key={action.title}>
              <h2>{action.title}</h2>
              <p style={{ color: "#cbd5e1", marginBottom: 18 }}>{action.description}</p>
              {action.available && action.href ? (
                <Link href={action.href} className={styles.navLink}>
                  {action.ctaLabel}
                </Link>
              ) : (
                <button
                  type="button"
                  className={styles.navLink}
                  disabled
                  title="This admin feature is not available yet."
                  style={{ cursor: "not-allowed", opacity: 0.6 }}
                >
                  {action.ctaLabel}
                </button>
              )}
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
