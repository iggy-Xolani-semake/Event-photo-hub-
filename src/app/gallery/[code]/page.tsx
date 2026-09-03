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

  const { data: allPhotos } = await admin
    .from("photos")
    .select("*")
    .eq("event_id", event.id)
    .neq("status", "deleted")
    .order("uploaded_at", { ascending: false })
    .returns<Photo[]>();

  const photos = (allPhotos ?? []).filter(
    (photo) => photo.status === "ready" && !photo.is_hidden
  );
  const processingCount = (allPhotos ?? []).filter(
    (photo) => photo.status === "processing"
  ).length;
  const failedCount = (allPhotos ?? []).filter(
    (photo) => photo.status === "failed"
  ).length;

  const galleryPhotos = photos.map((p) => ({
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
      processingCount={processingCount}
      failedCount={failedCount}
    />
  );
}
