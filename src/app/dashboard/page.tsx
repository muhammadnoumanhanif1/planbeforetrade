import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { AnalysisDashboard } from "@/features/analysis/AnalysisDashboard";
import { isTemporaryPublicAccessEnabled } from "@/lib/auth-access";

export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  title: "Dashboard",
  description: "Explore the Dashboard page on Plan Before Trade. Get the latest insights, tools, and signals to optimize your cryptocurrency trading strategy.",
};

export default async function DashboardPage() {
  const isTemporaryPublicAccess = isTemporaryPublicAccessEnabled();
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user && !isTemporaryPublicAccess) {
    redirect("/login");
  }

  return (
    <div className="p-4">
      <AnalysisDashboard />
    </div>
  );
}
