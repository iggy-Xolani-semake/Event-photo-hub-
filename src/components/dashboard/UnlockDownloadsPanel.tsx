"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  eventCode: string;
  unlockedAt: string | null;
  packageName: string | null;
  priceLabel: string | null;
  hasPackage: boolean;
}

interface CheckoutResponse {
  status?: string;
  unlockedAt?: string;
  checkoutUrl?: string;
  checkoutFields?: Record<string, string>;
  message?: string;
  error?: string;
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
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startPayFastCheckout() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/events/${eventCode}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: "ZAR" }),
      });
      const body = (await res.json().catch(() => ({}))) as CheckoutResponse;

      if (!res.ok) {
        setError(body.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }

      if (body.status === "already_unlocked") {
        setBusy(false);
        router.refresh();
        return;
      }

      if (!body.checkoutUrl || !body.checkoutFields) {
        setError("Payment checkout is not ready yet. Please try again shortly.");
        setBusy(false);
        return;
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = body.checkoutUrl;
      form.style.display = "none";

      for (const [name, value] of Object.entries(body.checkoutFields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      setMessage(body.message ?? "Redirecting you to PayFast…");
      form.submit();
    } catch {
      setError("We could not start PayFast checkout. Please try again.");
      setBusy(false);
    }
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
    <section className="rounded-xl border border-slate-800 bg-slate-800/40 p-5">
      <h2 className="mb-2 font-medium">Unlock original downloads</h2>
      <p className="mb-4 text-sm leading-relaxed text-slate-400">
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
        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3 text-sm text-slate-300">
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
            onClick={startPayFastCheckout}
            disabled={busy}
            className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Opening PayFast…" : priceLabel ? `Pay ${priceLabel}` : "Pay with PayFast"}
          </button>
        )}
      </div>
      {!hasPackage && (
        <p className="mt-3 text-xs text-slate-500">
          Events created before packages existed have no tier. Ask us to assign one.
        </p>
      )}
    </section>
  );
}
