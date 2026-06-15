import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { AdminAccessRestricted } from "@/components/AdminAccessRestricted";
import { createServerClient } from "@/lib/supabase-server";
import styles from "../../../page.module.css";
import { AdminBlogForm } from "../AdminBlogForm";

export const dynamic = "force-dynamic";

export default async function AdminBlogNewPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AdminAccessRestricted message="Please sign in with an admin account to create blog posts." />;
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
              You do not have permission to add blog posts.
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
              <h1>CREATE BLOG POST</h1>
              <p className={styles.subtitle}>Only admins can create and publish blog posts.</p>
            </div>
          </div>
        </header>
        <section className={styles.card}>
          <h2>New Post</h2>
          <AdminBlogForm mode="create" />

          <p style={{ marginTop: 16 }}>
            <Link href="/blog" className={styles.navLink}>
              View public blog
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
