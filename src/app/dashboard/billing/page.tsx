import { BadgeCheck, Lock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireUser } from "@/lib/auth/requireUser";
import { formatPrice } from "@/lib/packages";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Event, Package } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * Billing & Packages: what a pass costs, and which of the host's events have
 * one. Prices come from the packages table (the same rows the checkout uses),
 * never from copy hardcoded here, so a price change shows up everywhere at
 * once.
 */
export default async function BillingPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/login?redirectTo=/dashboard/billing");
  }

  const supabase = await createSupabaseServerClient();
  const { data: events } = await supabase
    .from("events")
    .select("event_code, event_name, photo_count, package_id, download_unlocked_at")
    .order("created_at", { ascending: false })
    .returns<Pick<Event, "event_code" | "event_name" | "photo_count" | "package_id" | "download_unlocked_at">[]>();

  const admin = createSupabaseAdminClient();
  const { data: packages } = await admin
    .from("packages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .returns<Package[]>();

  const myEvents = events ?? [];
  const tiers = packages ?? [];

  return (
    <div className="space-y-10">
      <PageHeader
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Billing & Packages" }]}
        title="Billing & Packages"
        description="One once-off pass per event. Browsing and previews stay free forever."
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">
          Available passes
        </h2>

        {tiers.length === 0 ? (
          <EmptyState
            icon={<BadgeCheck className="h-6 w-6" strokeWidth={2} />}
            title="No passes on sale yet"
            description="Packages are configured by the shutaMzala team. Your events keep collecting photos in the meantime."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tiers.map((tier) => (
              <Card key={tier.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-100">{tier.name}</h3>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                      {tier.code}
                    </p>
                  </div>
                  <span className="text-2xl font-bold tracking-tight text-white">
                    {formatPrice(tier.price_cents, tier.currency)}
                  </span>
                </div>
                <ul className="mt-5 space-y-2 text-sm text-slate-400">
                  <li>Up to {tier.photo_limit.toLocaleString()} photos</li>
                  <li>
                    {(tier.max_file_size_bytes / (1024 * 1024)).toFixed(0)} MB per file ·{" "}
                    {tier.max_files_per_upload} per upload
                  </li>
                  <li>Original high-res ZIP unlock</li>
                </ul>
                <ButtonLink href="/dashboard#new-event" variant="secondary" size="sm" className="mt-6">
                  Use for a new event
                </ButtonLink>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">
          Pass status by event
        </h2>

        {myEvents.length === 0 ? (
          <EmptyState
            icon={<Lock className="h-6 w-6" strokeWidth={2} />}
            title="Nothing to bill yet"
            description="Once you create an event and unlock its originals, the receipt trail appears here."
            action={
              <ButtonLink href="/dashboard" variant="secondary">
                Back to events
              </ButtonLink>
            }
          />
        ) : (
          <Card dense className="divide-y divide-slate-800 p-0">
            {myEvents.map((event) => (
              <div key={event.event_code} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/events/${event.event_code}`}
                    className="block truncate font-medium text-slate-100 transition-colors hover:text-white"
                  >
                    {event.event_name}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {event.photo_count.toLocaleString()} photos collected
                  </p>
                </div>
                {event.download_unlocked_at ? (
                  <Badge tone="success" dot>
                    Unlocked
                  </Badge>
                ) : (
                  <Badge tone="neutral">Previews only</Badge>
                )}
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
