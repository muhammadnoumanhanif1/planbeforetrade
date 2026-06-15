import Link from "next/link";
import styles from "@/app/page.module.css";

type AdminAccessRestrictedProps = {
  message: string;
};

export function AdminAccessRestricted({ message }: AdminAccessRestrictedProps) {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>ACCESS RESTRICTED</h1>
            </div>
          </div>
        </header>
        <section className={styles.card}>
          <h2>Authentication Required</h2>
          <p style={{ color: "#94a3b8", marginBottom: 16 }}>{message}</p>
          <Link href="/dashboard" className={styles.navLink}>
            Back to Dashboard
          </Link>
        </section>
      </main>
    </div>
  );
}
