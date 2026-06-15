import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { createServerClient as createUserClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Delete user account
 * This endpoint deletes the user's account and all associated data
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Create a client to get the current user
    const supabase = createUserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore
            }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Use admin client to delete the user
    const adminClient = createAdminClient();

    // Delete user's data first (cascade should handle this, but being explicit)
    await adminClient.from("saved_analyses").delete().eq("user_id", user.id);
    await adminClient.from("alerts").delete().eq("user_id", user.id);
    await adminClient.from("watchlists").delete().eq("user_id", user.id);
    await adminClient.from("usage_logs").delete().eq("user_id", user.id);
    await adminClient.from("subscriptions").delete().eq("user_id", user.id);
    await adminClient.from("pakistan_payments").delete().eq("user_id", user.id);
    await adminClient.from("profiles").delete().eq("id", user.id);

    // Delete the auth user
    const { error } = await adminClient.auth.admin.deleteUser(user.id);

    if (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      );
    }

    // Clear the session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.delete("sb-access-token");
    response.cookies.delete("sb-refresh-token");

    return response;
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
