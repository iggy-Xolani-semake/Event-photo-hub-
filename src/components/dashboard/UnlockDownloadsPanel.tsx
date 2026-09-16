"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  eventCode: string;
  unlockedAt: string | null;
  packageName: string | null;
  priceLabel: string | null;
  hasPackage: boolean;
  isAdmin: boolean;
}

/**
 * The paywall, from the host's side.
 *
 * Everything above this panel is free: the gallery, the QR code, the guest
 * uploads. This is the one thing that costs money, and it is the only place
 * in the product where a client is asked for it — guests never see it.
 */
export function UnlockDownloadsPanel({
  eventCode,
  unlockedAt,
  packageName,
  priceLabel,
  hasPackage,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string) {
    setBusy(true);
    setError(null);
    setMessage(null);

    const res = await fetch(url, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }

    if (body.status === "already_unlocked") {
      router.refresh();
      return;
    }

    setMessage(body.message ?? "Payment started.");
    router.refresh();
  }

  if (unlockedAt) {
    return (
      <section className="rounded-xl border border-green-500/30 bg-green-500/10 p-5">
        <h2 className="mb-1 font-medium text-green-200">Downloads unlocked</h2>
        <p className="text-sm text-green-100/70">
          Paid on {new Date(unlockedAt).toLocaleDateString("en-GB")}. Full-resolution downloads are
          available in your gallery.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h2 className="mb-2 font-medium">Unlock original downloads</h2>

      <p className="mb-4 text-sm leading-relaxed text-white/60">
        Your guests can already see and share the gallery — that part is free. Downloading the
        full-resolution originals is what the package pays for.
        {packageName ? (
          <>
            {" "}
            Your event is on <span className="text-white">{packageName}</span>
            {priceLabel ? <> ({priceLabel})</> : <> (price to be confirmed)</>}.
          </>
        ) : (
          " This event has no package yet."
        )}
      </p>

      {message && (
        <div className="mb-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {hasPackage && (
          <button
            type="button"
            onClick={() => call(`/api/events/${eventCode}/checkout`)}
            disabled={busy}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-ink-950 disabled:opacity-60"
          >
            {busy ? "Working…" : priceLabel ? `Pay ${priceLabel}` : "Start payment"}
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => call(`/api/admin/events/${eventCode}/mark-paid`)}
            disabled={busy}
            className="rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Mark as paid (EFT confirmed)
          </button>
        )}
      </div>

      {!hasPackage && (
        <p className="mt-3 text-xs text-white/40">
          Events created before packages existed have no tier. Ask us to assign one.
        </p>
      )}
    </section>
  );
}
