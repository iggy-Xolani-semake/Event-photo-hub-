import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatStorageSize } from "@/lib/format";
import { EventQrCode } from "@/components/admin/EventQrCode";
import { PrintablePoster } from "@/components/admin/PrintablePoster";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { ShareEventButton } from "@/components/admin/ShareEventButton";
import { EventStatusControls } from "@/components/admin/EventStatusControls";
import { EventSettingsForm } from "@/components/admin/EventSettingsForm";
import Link from "next/link";
import type { Event } from "@/types/database";

interface PageProps {
  params: Promise<{ code: string }>;
}

export const dynamic = "force-dynamic";

function resolveBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return baseUrl.replace(/\/+$/, "");
}

export default async function EventManagementPage({ params }: PageProps) {
  const { code } = await params;
  const eventCode = code.toUpperCase();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = (user?.app_metadata as Record<string, unknown> | undefined)?.role === "admin";

  // RLS scopes this to events the caller owns (or all, if admin) — a
  // client trying /admin/events/SOMEONE-ELSES-CODE simply gets no row
  // back, which we treat as 404 rather than "forbidden" to avoid
  // confirming the code exists at all.
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("event_code", eventCode)
    .maybeSingle<Event>();

  if (!event) {
    notFound();
  }

  let collaboratorEmail: string | null = null;
  if (event.collaborator_id) {
    const { data: collaborator } = await supabase
      .from("collaborators")
      .select("email")
      .eq("id", event.collaborator_id)
      .maybeSingle();
    collaboratorEmail = collaborator?.email ?? null;
  }

  const guestUrl = `${resolveBaseUrl()}/e/${event.event_code}`;
  const galleryUrl = `${resolveBaseUrl()}/gallery/${event.event_code}`;
  const storagePercent = Math.min(
    100,
    Math.round((event.photo_count / event.upload_limit) * 100)
  );

  // Surfaces stuck/failed uploads directly to the admin — without this,
  // a photo stuck in "processing" (e.g. image-processing pipeline down)
  // looks identical to "no uploads yet", which is exactly the confusion
  // that made the missing-webhook bug hard to diagnose from the UI alone.
  const { count: processingCount } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("status", "processing");

  const { count: failedCount } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("status", "failed");

  return (
    <main className="p-6 md:p-8 max-w-5xl mx-auto">
      <Link href="/admin" className="text-sm text-white/50 hover:text-white/80">
        ← Back to dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3 mb-8">
        <div>
          <h1 className="font-display text-3xl">{event.event_name}</h1>
          <p className="text-white/50 text-sm mt-1">
            {event.event_date &&
              new Date(event.event_date + "T00:00:00").toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }) + " · "}
            {event.photo_count.toLocaleString()} photos · {formatStorageSize(event.storage_used_bytes)} ·{" "}
            {event.visibility}
          </p>
        </div>
        <EventStatusControls eventCode={event.event_code} status={event.status} />
      </div>

      {storagePercent >= 80 && event.status === "active" && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm rounded-xl px-4 py-3 mb-6">
          This event has used {storagePercent}% of its {event.upload_limit.toLocaleString()} photo
          limit. Consider raising the limit in Settings below.
        </div>
      )}

      {!!processingCount && processingCount > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 text-blue-200 text-sm rounded-xl px-4 py-3 mb-6">
          {processingCount} photo{processingCount !== 1 ? "s" : ""} still processing — these will
          appear in the gallery shortly.
        </div>
      )}

      {!!failedCount && failedCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl px-4 py-3 mb-6">
          {failedCount} photo{failedCount !== 1 ? "s" : ""} failed to process and won&apos;t appear in
          the gallery.
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="font-medium mb-3">Quick actions</h2>
            <div className="grid grid-cols-3 gap-3">
              <Link
                href={galleryUrl}
                target="_blank"
                className="text-center text-sm bg-white/10 border border-white/20 rounded-lg px-4 py-3"
              >
                View Gallery
              </Link>
              <CopyLinkButton url={guestUrl} label="Copy Guest Link" />
              <CopyLinkButton url={galleryUrl} label="Copy Gallery Link" />
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="font-medium mb-4">Event settings</h2>
            <EventSettingsForm event={event} collaboratorEmail={collaboratorEmail} isAdmin={isAdmin} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="font-medium mb-4 text-center">Guest QR Code</h2>
            <EventQrCode url={guestUrl} />
            <p className="text-white/40 text-xs text-center mt-4 break-all">{guestUrl}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <CopyLinkButton url={guestUrl} label="Copy event link" />
              <ShareEventButton url={guestUrl} title={event.event_name} />
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="font-medium mb-4">Printable Poster</h2>
            <PrintablePoster eventName={event.event_name} url={guestUrl} />
          </section>
        </div>
      </div>
    </main>
  );
}
