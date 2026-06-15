import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { MarketStructureSignalsClient } from "@/features/market-structure-signals/MarketStructureSignalsClient";
import { isTemporaryPublicAccessEnabled } from "@/lib/auth-access";

export const dynamic = "force-dynamic";

export default async function MarketStructureSignalsPage() {
  const isTemporaryPublicAccess = isTemporaryPublicAccessEnabled();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isTemporaryPublicAccess) {
    redirect("/login?next=%2Fmarket-structure-signals");
  }

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "white" }}>Loading Signals Dashboard...</div>}>
      <MarketStructureSignalsClient />
    </Suspense>
  );
}
