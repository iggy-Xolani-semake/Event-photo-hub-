import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Creates (or returns) the signed-in user's own client profile.
 *
 * Called right after signup and again lazily by /dashboard, because with
 * Supabase email confirmation turned ON, signUp() returns no session — so
 * there is no moment during registration where a profile could be created.
 * Making it idempotent and calling it wherever a client_id is needed means
 * both flows (confirmation on or off) end up in the same place.
 *
 * Identity comes from the session, never from the request body: the RPC
 * reads auth.uid() and auth.jwt()->>'email'. The body may only supply a
 * display name and phone number.
 */
export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { name, phone } = (await request.json().catch(() => ({}))) as {
    name?: string;
    phone?: string;
  };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_own_client_profile", {
    p_name: name?.trim() || null,
    p_phone: phone?.trim() || null,
  });

  if (error) {
    // EMAIL_ALREADY_LINKED means an admin created a client row for this email
    // and bound it to a different auth user. That needs a human, not a retry.
    const message =
      error.message === "EMAIL_ALREADY_LINKED"
        ? "That email is already linked to another account. Contact your event host."
        : "Could not set up your account. Please try again.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ clientId: data });
}
