import Link from "next/link";
import { notFound } from "next/navigation";
import { findManagedEvent } from "@/lib/auth/eventAccess";
import { requireUser } from "@/lib/auth/requireUser";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/packages";
import { UnlockDownloadsPanel } from "@/components/dashboard/UnlockDownloadsPanel";
import { formatEventDate, formatStorageSize } from "@/lib/format";
import { EventQrCode } from "@/components/admin/EventQrCode";
import { PrintablePoster } from "@/components/admin/PrintablePoster";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { EventStatusControls } from "@/components/admin/EventStatusControls";
import { EventSettingsForm } from "@/components/admin/EventSettingsForm";
import type { Package } from "@/types/database";

interface PageProps {
  params: Promise<{ code: string }>;
}

export const dynamic = "force-dynamic";

function resolveBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * A client managing one of their own events.
 *
 * Access is decided by findManagedEvent(), which reads through the
 * session-bound client — so events_select_authenticated returns the row only
 * to its owner (or a site admin). Somebody else's code renders the 404 page,
 * which also avoids confirming that the code exists.
 *
 * The settings and status components are the same ones the admin console
 * uses; only the endpoint differs, pointing at /api/events/{code} (ownership
 * RLS) instead of /api/admin/** (requireAdmin).
 */
export default async function ClientEventPage({ params }: PageProps) {
  const { code } = await params;
  const event = await findManagedEvent(code);

  if (!event) {
    notFound();
  }

  const user = await requireUser();

  const admin = createSupabaseAdminClient();
  const { data: pkg } = event.package_id
    ? await admin.from("packages").select("*").eq("id", event.package_id).maybeSingle<Package>()
    : { data: null };

  const baseUrl = resolveBaseUrl();
  const guestUrl = `${baseUrl}/e/${event.event_code}`;
  const galleryUrl = `${baseUrl}/gallery/${event.event_code}`;
  const date = formatEventDate(event.event_date);
  const usedPercent = Math.min(100, Math.round((event.photo_count / event.upload_limit) * 100));

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-8">
      <Link href="/dashboard" className="text-sm text-white/50 hover:text-white/80">
        ← Back to my events
      </Link>

      <div className="mt-3 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{event.event_name}</h1>
          <p className="mt-1 text-sm text-white/50">
            {date ? `${date} · ` : ""}
            {event.photo_count.toLocaleString()} of {event.upload_limit.toLocaleString()} photos ·{" "}
            {formatStorageSize(event.storage_used_bytes)}
          </p>
        </div>
        <EventStatusControls
          eventCode={event.event_code}
          status={event.status}
          endpoint={`/api/events/${event.event_code}`}
        />
      </div>

      {usedPercent >= 80 && event.status === "active" && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          This gallery has used {usedPercent}% of its {event.upload_limit.toLocaleString()} photo
          limit. Raise the limit in Event settings below if your event is still running.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <section className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-3 font-medium">Share with your guests</h2>
            <div className="grid grid-cols-2 gap-3">
              <CopyLinkButton url={guestUrl} label="Copy Guest Link" />
              <CopyLinkButton url={galleryUrl} label="Copy Gallery Link" />
              <Link
                href={guestUrl}
                target="_blank"
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-center text-sm"
              >
                Open Guest Page
              </Link>
              <Link
                href={galleryUrl}
                target="_blank"
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-center text-sm"
              >
                View Gallery
              </Link>
            </div>
          </section>

          <UnlockDownloadsPanel
            eventCode={event.event_code}
            unlockedAt={event.download_unlocked_at}
            packageName={pkg?.name ?? null}
            priceLabel={formatPrice(pkg?.price_cents ?? null, pkg?.currency ?? "ZAR")}
            hasPackage={Boolean(pkg)}
            isAdmin={user?.isAdmin ?? false}
          />

          <section className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-4 font-medium">Event settings</h2>
            <EventSettingsForm event={event} endpoint={`/api/events/${event.event_code}`} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-4 text-center font-medium">Guest QR Code</h2>
            <EventQrCode url={guestUrl} />
            <p className="mt-4 break-all text-center text-xs text-white/40">{guestUrl}</p>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-4 font-medium">Printable Poster</h2>
            <PrintablePoster eventName={event.event_name} url={guestUrl} />
          </section>
        </div>
      </div>
    </main>
  );
}
