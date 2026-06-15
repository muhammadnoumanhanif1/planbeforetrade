import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { SignalsTelegramClient } from "@/features/signals/SignalsTelegramClient";
import { isTemporaryPublicAccessEnabled } from "@/lib/auth-access";

export const dynamic = "force-dynamic";

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
