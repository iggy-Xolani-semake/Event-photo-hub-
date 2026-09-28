import { notFound } from "next/navigation";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { EventQrCode } from "@/components/admin/EventQrCode";
import { EventSettingsForm } from "@/components/admin/EventSettingsForm";
import { EventStatusControls } from "@/components/admin/EventStatusControls";
import { PrintablePoster } from "@/components/admin/PrintablePoster";
import { UnlockDownloadsPanel } from "@/components/dashboard/UnlockDownloadsPanel";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { findManagedEvent } from "@/lib/auth/eventAccess";
import { requireUser } from "@/lib/auth/requireUser";
import { formatEventDate, formatStorageSize } from "@/lib/format";
import { formatPrice } from "@/lib/packages";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Package } from "@/types/database";
import Link from "next/link";

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
    <div className="space-y-8">
      <PageHeader
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Events", href: "/dashboard" },
          { label: event.event_name },
        ]}
        title={event.event_name}
        description={
          <>
            {date ? `${date} · ` : ""}
            {event.photo_count.toLocaleString()} of {event.upload_limit.toLocaleString()} memories ·{" "}
            {formatStorageSize(event.storage_used_bytes)}
          </>
        }
        actions={
          <EventStatusControls
            eventCode={event.event_code}
            status={event.status}
            endpoint={`/api/events/${event.event_code}`}
          />
        }
      />

      {usedPercent >= 80 && event.status === "active" && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm leading-relaxed text-amber-200"
        >
          This gallery has used {usedPercent}% of its {event.upload_limit.toLocaleString()} moment
          limit. Raise the limit in Event settings below if your event is still running.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Share with your guests"
              description="Print the poster, or send the link to the group chat."
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CopyLinkButton url={guestUrl} label="Copy Guest Link" />
              <CopyLinkButton url={galleryUrl} label="Copy Memories Link" />
              <Link
                href={guestUrl}
                target="_blank"
                className="flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                Open Guest Page
              </Link>
              <Link
                href={galleryUrl}
                target="_blank"
                className="flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                See Memories
              </Link>
            </div>
          </Card>

          <UnlockDownloadsPanel
            eventCode={event.event_code}
            unlockedAt={event.download_unlocked_at}
            packageName={pkg?.name ?? null}
            priceLabel={formatPrice(pkg?.price_cents ?? null, pkg?.currency ?? "ZAR")}
            hasPackage={Boolean(pkg)}
            isAdmin={user?.isAdmin ?? false}
          />

          <Card>
            <CardHeader
              title="Event settings"
              description="Limits, visibility and deadlines. Changes apply immediately."
            />
            <EventSettingsForm event={event} endpoint={`/api/events/${event.event_code}`} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Guest QR Code" />
            <EventQrCode url={guestUrl} />
            <p className="mt-4 break-all text-center text-xs text-slate-500">{guestUrl}</p>
          </Card>

          <Card>
            <CardHeader title="Printable Poster" description="A4-ready, with the code as a fallback." />
            <PrintablePoster eventName={event.event_name} url={guestUrl} />
          </Card>
        </div>
      </div>
    </div>
  );
}
