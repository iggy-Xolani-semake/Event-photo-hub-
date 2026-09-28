import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Saves the signed-in user's own client profile (name + phone).
 *
 * Two RPCs, because creating and editing are different intents:
 *
 *   1. `update_own_client_profile()` (0023) — edits the existing row. This is
 *      the path the Account Settings form needs, and the one that was missing:
 *      the route used to call the *create* function with the new name, and
 *      that function returns early for a caller who already has a row, so the
 *      edit was silently discarded.
 *   2. `create_own_client_profile()` (0005) — still the only way a clients row
 *      comes into existence, used here as the fallback for a signed-in user
 *      who has none (a database that predates the signup trigger, or an
 *      account created before this branch). It also adopts an admin-created
 *      row that matches the caller's email.
 *
 * Identity comes from the session, never from the request body: neither RPC
 * takes a user id, they read auth.uid() and auth.jwt()->>'email'. The body may
 * only supply a display name and a phone number.
 */

interface SavedProfile {
  id: string;
  name: string;
  phone: string | null;
}

function parseBody(body: unknown): { name: string | null; phone: string | null } {
  const input = (body ?? {}) as { name?: unknown; phone?: unknown };
  return {
    // null = "not supplied, leave it alone"; "" = "clear it". Only strings are
    // accepted, so a JSON body of {"name": 42} cannot reach the RPC.
    name: typeof input.name === "string" ? input.name : null,
    phone: typeof input.phone === "string" ? input.phone : null,
  };
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { name, phone } = parseBody(await request.json().catch(() => ({})));
  const supabase = await createSupabaseServerClient();

  const { data: updated, error: updateError } = await supabase.rpc("update_own_client_profile", {
    p_name: name,
    p_phone: phone,
  });

  if (!updateError) {
    const profile = updated as SavedProfile | null;
    return NextResponse.json({
      clientId: profile?.id ?? null,
      name: profile?.name ?? null,
      phone: profile?.phone ?? null,
    });
  }

  const message = updateError.message ?? "";

  // Field-level rejections from 0023 — the form checks these too, so reaching
  // here means someone posted past the UI.
  if (message.includes("NAME_REQUIRED")) {
    return NextResponse.json(
      { error: "Enter the name you want guests to see on your events." },
      { status: 400 }
    );
  }

  if (message.includes("NAME_TOO_LONG")) {
    return NextResponse.json(
      { error: "That name is too long — keep it under 120 characters." },
      { status: 400 }
    );
  }

  if (message.includes("PHONE_TOO_LONG")) {
    return NextResponse.json(
      { error: "That phone number is too long — keep it under 32 characters." },
      { status: 400 }
    );
  }

  if (!message.includes("PROFILE_NOT_FOUND")) {
    console.error("update_own_client_profile failed:", message);
    return NextResponse.json(
      { error: "Could not save your details. Please try again." },
      { status: 409 }
    );
  }

  // No clients row for this session yet: create one, carrying the details the
  // caller just typed (the signup trigger normally means this never happens).
  const { data: created, error: createError } = await supabase.rpc("create_own_client_profile", {
    p_name: name,
    p_phone: phone,
  });

  if (createError) {
    // EMAIL_ALREADY_LINKED means an admin created a client row for this email
    // and bound it to a different auth user. That needs a human, not a retry.
    const createMessage = createError.message ?? "";
    const friendly = createMessage.includes("EMAIL_ALREADY_LINKED")
      ? "That email is already linked to another account. Contact your event host."
      : "Could not set up your account. Please try again.";
    return NextResponse.json({ error: friendly }, { status: 409 });
  }

  return NextResponse.json({
    clientId: created,
    name: name?.trim() || null,
    phone: phone?.trim() || null,
  });
}
