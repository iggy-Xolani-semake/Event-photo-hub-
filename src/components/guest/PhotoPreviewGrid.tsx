"use client";

import type { UploadItem } from "./useGuestUploader";

interface Props {
  items: UploadItem[];
  maxFilesPerUpload: number;
  infoMessage: string | null;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onRetryFailed: () => void;
  onUpload: () => void;
  onContinue: () => void;
  onCancel: () => void;
}

export function PhotoPreviewGrid({
  items,
  maxFilesPerUpload,
  infoMessage,
  onRemove,
  onRetry,
  onRetryFailed,
  onUpload,
  onContinue,
  onCancel,
}: Props) {
  const isUploading = items.some((i) => i.status === "uploading" || i.status === "compressing");
  const successCount = items.filter((i) => i.status === "success").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const allDone = items.length > 0 && successCount + errorCount === items.length;
  const atLimit = items.length >= maxFilesPerUpload;

  return (
    <main className="flex min-h-screen flex-col px-5 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* FROG #8 — the limit is visible as a counter, never a surprise. */}
        <div className="mb-4 flex items-baseline justify-between">
          <p className="text-sm text-white/60">
            <span className="text-base font-semibold text-white">{items.length}</span> /{" "}
            {maxFilesPerUpload} photos
          </p>
          {atLimit && <p className="text-xs text-white/40">That&apos;s the most at once</p>}
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2">
          {items.map((item) => (
            <div key={item.id} className="relative aspect-square overflow-hidden rounded-xl bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL preview, not an R2 asset */}
              <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />

              {item.status !== "success" && !isUploading && (
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                  aria-label="Remove moment"
                >
                  ✕
                </button>
              )}

              {(item.status === "uploading" || item.status === "compressing") && (
                <div className="absolute inset-0 flex items-end bg-black/50">
                  <div className="h-1.5 w-full bg-black/40">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {item.status === "success" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="text-2xl">✓</span>
                </div>
              )}

              {item.status === "error" && (
                <button
                  type="button"
                  onClick={() => onRetry(item.id)}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-950/70 px-1 text-center"
                >
                  <span className="text-lg">⚠️</span>
                  <span className="text-[10px] leading-tight text-red-100">Tap to retry</span>
                </button>
              )}
            </div>
          ))}
        </div>

        {infoMessage && !isUploading && (
          <p className="mb-4 text-center text-sm text-white/50">{infoMessage}</p>
        )}

        <div className="mt-auto flex flex-col gap-3">
          {allDone && errorCount > 0 && successCount > 0 && (
            <p className="text-center text-sm text-amber-300">
              {errorCount} photo{errorCount === 1 ? "" : "s"} didn&apos;t upload.
            </p>
          )}
          {allDone && successCount === 0 && (
            <p className="text-center text-sm text-amber-300">
              None of your memories made it through. Check your connection and try again.
            </p>
          )}

          {allDone ? (
            <>
              <button
                type="button"
                onClick={successCount > 0 ? onContinue : onRetryFailed}
                className="tap-target w-full rounded-2xl bg-accent px-6 py-4 text-lg font-semibold text-ink-950 transition-transform active:scale-[0.98]"
              >
                {successCount > 0 ? "Continue" : "Try again"}
              </button>
              {successCount > 0 && errorCount > 0 && (
                <button
                  type="button"
                  onClick={onRetryFailed}
                  className="tap-target w-full rounded-2xl border border-amber-400/40 bg-amber-400/10 px-6 py-3 text-base font-semibold text-amber-100"
                >
                  Retry the {errorCount} that failed
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onUpload}
                disabled={isUploading}
                className="tap-target w-full rounded-2xl bg-accent px-6 py-4 text-lg font-semibold text-ink-950 transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {isUploading
                  ? "Uploading…"
                  : `Share ${items.length} photo${items.length === 1 ? "" : "s"}`}
              </button>
              {!isUploading && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="tap-target w-full rounded-2xl px-6 py-3 text-base font-medium text-white/60"
                >
                  Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
