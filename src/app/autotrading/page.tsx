import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { AutoTradingClient } from "./AutoTradingClient";
import { isTemporaryPublicAccessEnabled } from "@/lib/auth-access";

export const dynamic = "force-dynamic";

export default async function AutoTradingPage() {
  const isTemporaryPublicAccess = isTemporaryPublicAccessEnabled();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isTemporaryPublicAccess) {
    redirect("/login");
  }

  const isAdmin = user?.app_metadata?.role === "admin";

  return (
    <div className="p-4">
      <AutoTradingClient isAdmin={isAdmin} />
    </div>
  );
}
