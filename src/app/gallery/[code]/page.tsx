import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidEventCodeFormat } from "@/lib/eventCode";
import { EventNotFoundNotice } from "@/components/guest/EventNotFoundNotice";
import { GalleryView } from "@/components/gallery/GalleryView";
import { publicImageUrl } from "@/lib/storage/publicUrl";
import type { Event, Photo } from "@/types/database";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return { title: `Gallery — ${code}` };
}

export const dynamic = "force-dynamic";

export default async function GalleryPage({ params }: PageProps) {
  const { code } = await params;
  const eventCode = code.toUpperCase();

  if (!isValidEventCodeFormat(eventCode)) {
    return <EventNotFoundNotice />;
  }

  const admin = createSupabaseAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("*")
    .eq("event_code", eventCode)
    .maybeSingle<Event>();

  if (!event) {
    return <EventNotFoundNotice />;
  }

  // Access check: public/shared events are open to anyone with the link.
  // Private events require the requester to be the owning client or an
  // admin — checked against the SESSION-BOUND server client (not admin),
  // so RLS/auth actually gates this rather than us hand-rolling the
  // check against data fetched with elevated privileges.
  if (event.visibility === "private") {
    const sessionClient = await createSupabaseServerClient();
    const { data: userEvent } = await sessionClient
      .from("events")
      .select("id")
      .eq("id", event.id)
      .maybeSingle();

    if (!userEvent) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-semibold mb-2">Private gallery</h1>
          <p className="text-white/60 max-w-sm">
            This gallery is private. Please sign in as the event owner to view it.
          </p>
        </main>
      );
    }
  }

  const { data: photos } = await admin
    .from("photos")
    .select("*")
    .eq("event_id", event.id)
    .eq("status", "ready")
    .eq("is_hidden", false)
    .order("uploaded_at", { ascending: false })
    .returns<Photo[]>();

  const galleryPhotos = (photos ?? []).map((p) => ({
    ...p,
    thumbnailUrl: publicImageUrl(p.thumbnail_path),
    galleryUrl: publicImageUrl(p.gallery_path),
  }));

  return (
    <GalleryView
      eventCode={eventCode}
      eventName={event.event_name}
      photos={galleryPhotos}
      totalCount={event.photo_count}
    />
  );
}
