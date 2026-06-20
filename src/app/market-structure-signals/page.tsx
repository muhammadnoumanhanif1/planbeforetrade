import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { MarketStructureSignalsClient } from "@/features/market-structure-signals/MarketStructureSignalsClient";
import { isTemporaryPublicAccessEnabled } from "@/lib/auth-access";

export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  title: "Market Structure Signals",
  description: "Explore the Market Structure Signals page on Plan Before Trade. Get the latest insights, tools, and signals to optimize your cryptocurrency trading strategy.",
};

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
