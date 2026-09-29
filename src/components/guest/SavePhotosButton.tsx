"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import {
  canShareFiles,
  downloadFiles,
  isShareCancellation,
  pickSaveStrategy,
  shareFiles,
  shareFilesOneByOne,
} from "@/lib/guest/saveToPhone";

interface Props {
  /** The guest's own originals, straight from their file input. */
  files: File[];
  eventName: string;
  className?: string;
}

/**
 * "Save photos to my phone" — hands the guest's originals back to the device.
 *
 * Renders nothing without files, so the success screen can include it
 * unconditionally and a failed upload can't produce a dead button.
 *
 * The tricky part is what happens when sharing *fails*. Aborting means the
 * guest closed the sheet, which is a decision, not an error; anything else
 * falls back to downloads, and in the one-at-a-time case only the files that
 * never got a sheet are downloaded so nothing gets saved twice. Hence the
 * count of already-shared files is tracked outside the try block.
 */
export function SavePhotosButton({ files, eventName, className = "" }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (files.length === 0) return null;

  function reportDownloaded(count: number) {
    // iOS Safari ignores the `download` attribute, so the photo opens in a tab
    // instead of saving. That is exactly why sharing is the primary route; this
    // message has to cover both outcomes rather than claim a file landed.
    const noun = count === 1 ? "photo" : `${count} photos`;
    setStatus(
      `Sent ${noun} to your device — check your Downloads. If your phone opened them instead, ` +
        "long-press a photo and choose “Save Image”."
    );
  }

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    setStatus(null);

    const strategy = pickSaveStrategy(files, canShareFiles);
    const title = `${eventName} — my photos`;
    let shared = 0;

    if (strategy !== "download") {
      try {
        if (strategy === "share") {
          await shareFiles(files, title);
        } else {
          await shareFilesOneByOne(files, title, (count) => {
            shared = count;
          });
        }
        // The OS sheet was the feedback. There is nothing truthful to add: we
        // cannot see whether the guest chose "Save Image" or WhatsApp.
        setBusy(false);
        return;
      } catch (error) {
        if (isShareCancellation(error)) {
          setBusy(false);
          return;
        }
        // Fall through to downloads for whatever was not shared.
      }
    }

    const remaining = strategy === "share-each" ? files.slice(shared) : files;
    reportDownloaded(downloadFiles(remaining.length > 0 ? remaining : files));
    setBusy(false);
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="tap-target flex w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-700 bg-slate-800/60 px-6 py-4 text-base font-semibold text-white transition-colors hover:border-slate-600 hover:bg-slate-800 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
        Save {files.length === 1 ? "photo" : `${files.length} photos`} to my phone
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">
        Puts your own full-quality copy in your Photos or Gallery app.
      </p>
      {status && (
        <p role="status" aria-live="polite" className="mt-2 text-center text-xs text-emerald-300">
          {status}
        </p>
      )}
    </div>
  );
}
