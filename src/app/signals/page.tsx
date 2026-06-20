import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { SignalsTelegramClient } from "@/features/signals/SignalsTelegramClient";
import { isTemporaryPublicAccessEnabled } from "@/lib/auth-access";

export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  title: "Signals",
  description: "Explore the Signals page on Plan Before Trade. Get the latest insights, tools, and signals to optimize your cryptocurrency trading strategy.",
};

export default async function SignalsPage() {
  const isTemporaryPublicAccess = isTemporaryPublicAccessEnabled();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isTemporaryPublicAccess) {
    redirect("/login?next=%2Fsignals");
  }

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "white" }}>Loading Telegram Signals...</div>}>
      <SignalsTelegramClient />
    </Suspense>
  );
}
