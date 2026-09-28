"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  eventCode: string;
  eventName: string;
}

/**
 * Site-manager only: permanently deletes a whole event — its photos,
 * files in R2, payments and guest sessions — via
 * DELETE /api/admin/events/[code].
 *
 * Deliberately high-friction: the button opens a warning panel that
 * requires typing the event code before the final call can fire, because
 * there is no undo and no recycle bin behind it.
 */
export function DeleteEventButton({ eventCode, eventName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typedCode, setTypedCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeMatches = typedCode.trim().toUpperCase() === eventCode;

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventCode)}`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Delete failed");
      // Event is gone — back to the console list, which must re-fetch.
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the event. Please try again.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
      >
        <Trash2 className="h-4 w-4" strokeWidth={2.2} />
        Delete Event
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5"
      role="alertdialog"
      aria-label="Confirm deleting the whole event"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300">
          <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-rose-100">
            Delete &ldquo;{eventName}&rdquo; permanently?
          </h2>
          <p className="mt-1 text-sm text-rose-300/80">
            This removes the event, every photo and its files, payment records and guest
            sessions. There is no undo.
          </p>
        </div>
      </div>

      <label htmlFor="delete-event-code" className="mt-4 block text-xs font-medium uppercase tracking-wider text-rose-300/80">
        Type <span className="font-mono font-semibold text-rose-200">{eventCode}</span> to confirm
      </label>
      <input
        id="delete-event-code"
        value={typedCode}
        onChange={(e) => setTypedCode(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder={eventCode}
        className="mt-2 w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 font-mono text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      {error && (
        <p className="mt-3 text-sm font-medium text-rose-200" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={!codeMatches || busy}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2.2} />
          {busy ? "Deleting…" : "Permanently delete event"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setTypedCode("");
            setError(null);
          }}
          disabled={busy}
          className="rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
