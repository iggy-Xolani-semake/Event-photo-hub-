import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatStorageSize } from "@/lib/format";
import { EventQrCode } from "@/components/admin/EventQrCode";
import { PrintablePoster } from "@/components/admin/PrintablePoster";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { EventStatusControls } from "@/components/admin/EventStatusControls";
import { EventSettingsForm } from "@/components/admin/EventSettingsForm";
import Link from "next/link";
import type { Event } from "@/types/database";

interface PageProps {
  params: Promise<{ code: string }>;
}

export const dynamic = "force-dynamic";

function resolveBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export default async function EventManagementPage({ params }: PageProps) {
  const { code } = await params;
  const eventCode = code.toUpperCase();

  const supabase = await createSupabaseServerClient();
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

  const guestUrl = `${resolveBaseUrl()}/e/${event.event_code}`;
  const galleryUrl = `${resolveBaseUrl()}/gallery/${event.event_code}`;
  const storagePercent = Math.min(
    100,
    Math.round((event.photo_count / event.upload_limit) * 100)
  );

  return (
    <main className="p-6 md:p-8 max-w-5xl mx-auto">
      <Link href="/admin" className="text-sm text-white/50 hover:text-white/80">
        ← Back to dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3 mb-8">
        <div>
          <h1 className="font-display text-3xl">{event.event_name}</h1>
          <p className="text-white/50 text-sm mt-1">
            {event.photo_count.toLocaleString()} photos · {formatStorageSize(event.storage_used_bytes)}
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

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="font-medium mb-3">Quick actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={galleryUrl}
                target="_blank"
                className="text-center text-sm bg-white/10 border border-white/20 rounded-lg px-4 py-3"
              >
                View Gallery
              </Link>
              <CopyLinkButton url={guestUrl} label="Copy Guest Link" />
              <Link
                href={`/admin/events/${event.event_code}/settings`}
                className="text-center text-sm bg-white/10 border border-white/20 rounded-lg px-4 py-3"
              >
                Settings
              </Link>
              <CopyLinkButton url={galleryUrl} label="Copy Gallery Link" />
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="font-medium mb-4">Event settings</h2>
            <EventSettingsForm event={event} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="font-medium mb-4 text-center">Guest QR Code</h2>
            <EventQrCode url={guestUrl} />
            <p className="text-white/40 text-xs text-center mt-4 break-all">{guestUrl}</p>
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
