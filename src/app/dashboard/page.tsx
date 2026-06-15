import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { AnalysisDashboard } from "@/features/analysis/AnalysisDashboard";
import { isTemporaryPublicAccessEnabled } from "@/lib/auth-access";

export const dynamic = "force-dynamic";

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
