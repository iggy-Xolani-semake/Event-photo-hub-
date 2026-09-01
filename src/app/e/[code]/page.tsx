import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidEventCodeFormat } from "@/lib/eventCode";
import { GuestUploadExperience } from "@/components/guest/GuestUploadExperience";
import { EventClosedNotice } from "@/components/guest/EventClosedNotice";
import { EventNotFoundNotice } from "@/components/guest/EventNotFoundNotice";
import type { EventForUpload } from "@/types/database";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return { title: `Share your moment — ${code}` };
}

// This page is intentionally NOT statically generated — event status
// (open/closed/limit reached) must be fresh on every scan, since a QR
// code printed at a venue might be scanned hours after the event closes.
export const dynamic = "force-dynamic";

export default async function GuestEventPage({ params }: PageProps) {
  const { code } = await params;
  const eventCode = code.toUpperCase();

  if (!isValidEventCodeFormat(eventCode)) {
    return <EventNotFoundNotice />;
  }

  // Uses the admin client here purely to call the same public RPC guests
  // use — no auth session exists for a guest request, and the RPC itself
  // (get_event_for_upload) already restricts what fields come back, so
  // this is not a privilege escalation: it's the identical read a guest's
  // own anon-key client would get.
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("get_event_for_upload", { p_event_code: eventCode });

  if (error) {
    console.error("Failed to resolve event:", error);
    return <EventNotFoundNotice />;
  }

  const eventInfo = (data as EventForUpload[] | null)?.[0];

  if (!eventInfo || eventInfo.reason === "not_found") {
    return <EventNotFoundNotice />;
  }

  if (!eventInfo.can_upload) {
    return (
      <EventClosedNotice
        eventName={eventInfo.event_name ?? "This event"}
        reason={eventInfo.reason}
      />
    );
  }

  return (
    <GuestUploadExperience
      eventCode={eventCode}
      eventName={eventInfo.event_name ?? "This event"}
      eventDate={eventInfo.event_date}
      maxFileSizeBytes={eventInfo.max_file_size_bytes ?? 15 * 1024 * 1024}
      maxFilesPerUpload={eventInfo.max_files_per_upload ?? 10}
      brandCompanyName={eventInfo.brand_company_name}
      brandPrimaryColor={eventInfo.brand_primary_color}
    />
  );
}
