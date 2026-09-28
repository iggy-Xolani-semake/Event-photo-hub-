import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { isValidEventCodeFormat } from "@/lib/eventCode";
import { AppFooter } from "@/components/layout/AppFooter";
import { Clock, Lock } from "lucide-react";
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
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/60 text-slate-400">
            <Clock className="h-6 w-6" strokeWidth={2} />
          </span>
          <h1 className="mt-5 text-xl font-semibold text-white">Gallery access has ended</h1>
          <p className="mt-2 text-sm text-slate-400">
            This event&apos;s viewing period has ended. The original files remain retained by the
            event owner.
          </p>
        </div>
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
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <Lock className="h-6 w-6" strokeWidth={2} />
          </span>
          <h1 className="mt-5 text-xl font-semibold text-white">Private gallery</h1>
          <p className="mt-2 text-sm text-slate-400">
            This gallery is private. Please sign in as the event owner to view it.
          </p>
          <a
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
          >
            Sign in
          </a>
        </div>
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
    <div className="flex min-h-screen flex-col">
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
      <AppFooter />
    </div>
  );
}
