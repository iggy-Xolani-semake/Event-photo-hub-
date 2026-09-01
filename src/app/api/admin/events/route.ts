import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateEventCode } from "@/lib/eventCode";

/**
 * Creates (or reuses) a client record, then the event itself. Uses the
 * admin/service-role client because this needs to write across tables
 * regardless of RLS ownership boundaries — but requireAdmin() is checked
 * FIRST, so an unauthenticated or non-admin caller never reaches the
 * point where elevated privileges matter.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      eventName,
      eventDate,
      clientName,
      clientEmail,
      clientPhone,
      uploadLimit,
      maxFileSizeMb,
      maxFilesPerUpload,
    } = body as {
      eventName?: string;
      eventDate?: string;
      clientName?: string;
      clientEmail?: string;
      clientPhone?: string;
      uploadLimit?: number;
      maxFileSizeMb?: number;
      maxFilesPerUpload?: number;
    };

    if (!eventName || !clientName || !clientEmail) {
      return NextResponse.json(
        { error: "Event name, client name, and client email are required." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Reuse an existing client by email (case-insensitive, per the unique
    // index on clients.email) so the same couple/company running multiple
    // events doesn't accumulate duplicate client rows.
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .ilike("email", clientEmail)
      .maybeSingle();

    let clientId = existingClient?.id as string | undefined;

    if (!clientId) {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({ name: clientName, email: clientEmail, phone: clientPhone ?? null })
        .select("id")
        .single();

      if (clientError) {
        console.error("client insert failed:", clientError);
        return NextResponse.json({ error: "Could not create client record." }, { status: 500 });
      }
      clientId = newClient.id;
    }

    // Generate a unique event code, retrying on the (extremely unlikely)
    // collision rather than trusting one draw is always unique.
    let eventCode = generateEventCode();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: collision } = await supabase
        .from("events")
        .select("id")
        .eq("event_code", eventCode)
        .maybeSingle();
      if (!collision) break;
      eventCode = generateEventCode();
    }

    const { data: newEvent, error: eventError } = await supabase
      .from("events")
      .insert({
        event_code: eventCode,
        event_name: eventName,
        event_date: eventDate || null,
        client_id: clientId,
        upload_limit: uploadLimit ?? 500,
        max_file_size_bytes: (maxFileSizeMb ?? 15) * 1024 * 1024,
        max_files_per_upload: maxFilesPerUpload ?? 10,
        created_by: admin.userId,
      })
      .select("*")
      .single();

    if (eventError) {
      console.error("event insert failed:", eventError);
      return NextResponse.json({ error: "Could not create event." }, { status: 500 });
    }

    return NextResponse.json({ event: newEvent });
  } catch (err) {
    console.error("create event error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
