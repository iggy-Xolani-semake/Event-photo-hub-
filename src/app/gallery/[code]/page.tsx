import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { isValidEventCodeFormat } from "@/lib/eventCode";
import { EventNotFoundNotice } from "@/components/guest/EventNotFoundNotice";
import { GalleryView } from "@/components/gallery/GalleryView";
import { createPresignedDownloadUrl } from "@/lib/storage/signUpload";
import { resolveDownloadEntitlement } from "@/lib/auth/downloadEntitlement";
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

  if (event.gallery_expires_at && new Date(event.gallery_expires_at).getTime() <= Date.now()) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Gallery access has ended</h1>
        <p className="text-white/60 max-w-sm">
          This event&apos;s viewing period has ended. The original files remain retained by the event owner.
        </p>
      </main>
    );
  }

  // Single ownership check, used for two purposes:
  //   1. Private events require the requester to BE the owning client,
  //      collaborator, or admin — gated below.
  //   2. canManage (shown to GalleryView) controls whether delete
  //      actions render at all, regardless of visibility — a shared/
  //      public event is viewable by anyone with the link but should
  //      only be manageable by someone with a real relationship to it.
  // Checked against the SESSION-BOUND server client (not admin), so
  // RLS/auth actually gates this rather than us hand-rolling the check
  // against data fetched with elevated privileges.
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));
  let canManage = false;

  if (hasAuthCookie || event.visibility === "private") {
    const sessionClient = await createSupabaseServerClient();
    const { data: ownedEvent } = await sessionClient
      .from("events")
      .select("id")
      .eq("id", event.id)
      .maybeSingle();
    canManage = Boolean(ownedEvent);
  }

  if (event.visibility === "private" && !canManage) {
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

  const galleryPhotos = await Promise.all(photos.map(async (p) => ({
    ...p,
    thumbnailUrl: p.thumbnail_path ? await createPresignedDownloadUrl(p.thumbnail_path) : null,
    galleryUrl: p.gallery_path ? await createPresignedDownloadUrl(p.gallery_path) : null,
  })));

  const canAddPhotos =
    event.status === "active" &&
    event.photo_count < event.upload_limit &&
    (!event.uploads_close_at || new Date(event.uploads_close_at).getTime() > Date.now());

  // Looking is free; taking is not. Guests keep the gallery and lose the
  // download buttons, which is the whole point of Sprint 3.
  const entitlement = await resolveDownloadEntitlement(event.id);

  return (
    <GalleryView
      eventCode={eventCode}
      eventName={event.event_name}
      eventDate={event.event_date}
      photos={galleryPhotos}
      totalCount={event.photo_count}
      canManage={canManage}
      processingCount={processingCount}
      failedCount={failedCount}
      canAddPhotos={canAddPhotos}
      canDownload={entitlement.allowed}
      canViewEnlarged={entitlement.allowed}
    />
  );
}
