import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { SignalsHistoryClient } from "@/features/signals/SignalsHistoryClient";
import { isTemporaryPublicAccessEnabled } from "@/lib/auth-access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Signal History | Plan Before Trade",
  description: "View your past trading signals, win/loss results, and performance statistics.",
};

export default async function SignalsHistoryPage() {
  const isTemporaryPublicAccess = isTemporaryPublicAccessEnabled();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isTemporaryPublicAccess) {
    redirect("/login?next=%2Fsignals%2Fhistory");
  }

  return <SignalsHistoryClient />;
}
