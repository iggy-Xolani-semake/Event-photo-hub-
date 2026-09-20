import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidEventCodeFormat } from "@/lib/eventCode";
import { publicImageUrl } from "@/lib/storage/publicUrl";
import { GuestEventExperience } from "@/components/guest/GuestEventExperience";
import { EventClosedNotice } from "@/components/guest/EventClosedNotice";
import { EventNotFoundNotice } from "@/components/guest/EventNotFoundNotice";
import type { LandingTeaser } from "@/components/guest/EventLandingScreen";
import type { EventForUpload, EventVisibility } from "@/types/database";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ add?: string }>;
}

interface RecentPhotoRow {
  thumbnail_path: string | null;
  width: number | null;
  height: number | null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return { title: `Share your moment — ${code}` };
}

// This page is intentionally NOT statically generated — event status
// (open/closed/limit reached) and the "N photos shared so far" count must
// be fresh on every scan, since a QR code printed at a venue might be
// scanned hours after the event closes (and mid-event, the count is the
// whole point of the landing screen).
export const dynamic = "force-dynamic";

/** How many recent thumbnails to show as the "look what's already here" strip. */
const TEASER_LIMIT = 6;

export default async function GuestEventPage({ params, searchParams }: PageProps) {
  const { code } = await params;
  const { add } = await searchParams;
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

  // Two independent reads, fired together:
  //   * the RPC stays the single source of truth for "may this guest upload?"
  //     (status + event-wide limit, in one place, in Postgres)
  //   * the row read adds the one thing the RPC doesn't return — visibility,
  //     which decides whether there is a gallery to send the guest to.
  const [
    { data: rpcRows, error: rpcError },
    { data: eventRow },
  ] = await Promise.all([
    admin.rpc("get_event_for_upload", { p_event_code: eventCode }),
    admin
      .from("events")
      .select("id, visibility")
      .eq("event_code", eventCode)
      .maybeSingle<{ id: string; visibility: EventVisibility }>(),
  ]);

  if (rpcError) {
    console.error("Failed to resolve event:", rpcError);
    return <EventNotFoundNotice />;
  }

  const eventInfo = (rpcRows as EventForUpload[] | null)?.[0];

  if (!eventInfo || eventInfo.reason === "not_found") {
    return <EventNotFoundNotice />;
  }

  // Positive check, not "not private": if the row read comes back empty or
  // fails, we must NOT send a guest to a gallery we haven't confirmed
  // exists. Defaulting to false only costs them a CTA; defaulting to true
  // would send them to a 404.
  const galleryAvailable =
    eventRow?.visibility === "shared" || eventRow?.visibility === "public";
  const galleryHref = `/gallery/${eventCode}`;

  // One query does double duty: the 6 newest visible thumbnails for the
  // landing strip, and `count: "exact"` for the headline number — so the
  // count the guest reads here is the same set of photos they're about to
  // scroll, not events.photo_count (which also counts photos still being
  // processed or hidden by the host).
  let sharedCount: number | null = null;
  let teasers: LandingTeaser[] = [];

  if (eventRow?.id && galleryAvailable) {
    const { data: recentRows, count } = await admin
      .from("photos")
      .select("thumbnail_path, width, height", { count: "exact" })
      .eq("event_id", eventRow.id)
      .eq("status", "ready")
      .eq("is_hidden", false)
      .order("uploaded_at", { ascending: false })
      .limit(TEASER_LIMIT);

    sharedCount = count ?? 0;
    teasers = (recentRows as RecentPhotoRow[] | null)
      ?.map((row) => ({
        thumbnailUrl: publicImageUrl(row.thumbnail_path),
        aspectRatio: row.width && row.height ? `${row.width}/${row.height}` : null,
      }))
      .filter((t): t is LandingTeaser => Boolean(t.thumbnailUrl)) ?? [];
  }

  if (!eventInfo.can_upload) {
    return (
      <EventClosedNotice
        eventName={eventInfo.event_name ?? "This event"}
        reason={eventInfo.reason}
        // Archived events are gone entirely; closed/full ones still have a
        // gallery worth showing.
        galleryHref={galleryAvailable && eventInfo.reason !== "archived" ? galleryHref : null}
      />
    );
  }

  return (
    <GuestEventExperience
      eventCode={eventCode}
      eventName={eventInfo.event_name ?? "This event"}
      eventDate={eventInfo.event_date}
      sharedCount={sharedCount}
      galleryAvailable={galleryAvailable}
      maxFileSizeBytes={eventInfo.max_file_size_bytes ?? 15 * 1024 * 1024}
      maxFilesPerUpload={eventInfo.max_files_per_upload ?? 10}
      brandCompanyName={eventInfo.brand_company_name}
      teasers={teasers}
      cameFromGallery={add === "1"}
    />
  );
}
