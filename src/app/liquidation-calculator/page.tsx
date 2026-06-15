import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { isTemporaryPublicAccessEnabled } from "@/lib/auth-access";
import { LiquidationCalculatorClient } from "./liquidation-calculator-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Liquidation Calculator",
  description:
    "Compare estimated liquidation prices across Binance, Bitget, and MEXC for USDT-M perpetual futures.",
};

export default async function LiquidationCalculatorPage() {
  const isTemporaryPublicAccess = isTemporaryPublicAccessEnabled();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isTemporaryPublicAccess) {
    redirect("/login?next=%2Fliquidation-calculator");
  }

  return <LiquidationCalculatorClient />;
}
