import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isApprovedAdminUser } from "@/lib/auth/adminAllowlist";
import { createPresignedSlideshowUrl } from "@/lib/storage/signUpload";
import { isValidEventCodeFormat } from "@/lib/eventCode";
import type { Event, Photo } from "@/types/database";
import { EventSlideshow, type SlideshowPhoto } from "@/components/admin/EventSlideshow";

interface PageProps {
  params: Promise<{ code: string }>;
}

type SlideshowSourcePhoto = Pick<
  Photo,
  "id" | "storage_path" | "gallery_path" | "original_filename" | "mime_type" | "is_favourite"
>;

export const dynamic = "force-dynamic";

export default async function EventSlideshowPage({ params }: PageProps) {
  const { code } = await params;
  const eventCode = code.toUpperCase();
  if (!isValidEventCodeFormat(eventCode)) notFound();

  const session = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError) {
    console.error("slideshow owner authentication failed:", authError);
    throw new Error("Could not verify slideshow access.");
  }
  if (!isApprovedAdminUser(user)) notFound();

  const admin = createSupabaseAdminClient();
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("*")
    .eq("event_code", eventCode)
    .maybeSingle<Event>();

  if (eventError) {
    console.error("slideshow event fetch failed:", eventError);
    throw new Error("Could not load this event's slideshow.");
  }
  if (!event) notFound();

  const { data: photos, error: photosError } = await admin
    .from("photos")
    .select("id, storage_path, gallery_path, original_filename, mime_type, is_favourite")
    .eq("event_id", event.id)
    .eq("status", "ready")
    .eq("is_hidden", false)
    .order("uploaded_at", { ascending: false })
    .limit(event.upload_limit)
    .returns<SlideshowSourcePhoto[]>();

  if (photosError) {
    console.error("slideshow photo fetch failed:", photosError);
    throw new Error("Could not load this event's photos.");
  }

  const slideshowPhotos: SlideshowPhoto[] = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const browserSupportsOriginal = !["image/heic", "image/heif"].includes(
        photo.mime_type.toLowerCase()
      );
      const usesOriginal = browserSupportsOriginal || !photo.gallery_path;
      return {
        id: photo.id,
        url: await createPresignedSlideshowUrl(
          usesOriginal ? photo.storage_path : photo.gallery_path!
        ),
        filename: photo.original_filename,
        isFavourite: photo.is_favourite,
        usesOriginal,
      };
    })
  );

  return (
    <EventSlideshow
      eventCode={eventCode}
      eventName={event.event_name}
      photos={slideshowPhotos}
    />
  );
}
