import { redirect } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { AdminAccessRestricted } from "@/components/AdminAccessRestricted";
import { createServerClient } from "@/lib/supabase-server";
import styles from "../../page.module.css";
import { AiInsightsClient } from "./AiInsightsClient";

export const dynamic = "force-dynamic";

export default async function AdminAiInsightsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AdminAccessRestricted message="Please sign in with an admin account to access this area." />;
  }

  if (user.app_metadata?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
<div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>AI LEARNING INSIGHTS</h1>
              <p className={styles.subtitle}>Self-improving signal analytics from completed trade outcomes.</p>
            </div>
          </div>
        </header>
        <Navigation />
        <AiInsightsClient />
      </main>
    </div>
  );
}
