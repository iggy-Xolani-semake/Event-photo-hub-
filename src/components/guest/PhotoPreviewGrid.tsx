"use client";

import type { UploadItem } from "./useGuestUploader";

interface Props {
  items: UploadItem[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onUpload: () => void;
  onCancel: () => void;
}

export function PhotoPreviewGrid({ items, onRemove, onRetry, onUpload, onCancel }: Props) {
  const isUploading = items.some((i) => i.status === "uploading" || i.status === "compressing");
  const anyError = items.some((i) => i.status === "error");
  const allDone = items.length > 0 && items.every((i) => i.status === "success" || i.status === "error");

  return (
    <main className="min-h-screen flex flex-col px-5 py-8">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        <p className="text-white/60 text-sm mb-4">
          {items.length} photo{items.length !== 1 ? "s" : ""} selected
        </p>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {items.map((item) => (
            <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL preview, not an R2 asset */}
              <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />

              {item.status !== "success" && !isUploading && (
                <button
                  onClick={() => onRemove(item.id)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white text-xs"
                  aria-label="Remove photo"
                >
                  ✕
                </button>
              )}

              {(item.status === "uploading" || item.status === "compressing") && (
                <div className="absolute inset-0 bg-black/50 flex items-end">
                  <div className="w-full bg-black/40 h-1.5">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {item.status === "success" && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <span className="text-2xl">✓</span>
                </div>
              )}

              {item.status === "error" && (
                <button
                  onClick={() => onRetry(item.id)}
                  className="absolute inset-0 bg-red-950/70 flex flex-col items-center justify-center gap-1 text-center px-1"
                >
                  <span className="text-lg">⚠️</span>
                  <span className="text-[10px] leading-tight text-red-100">Tap to retry</span>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          {anyError && allDone && (
            <p className="text-amber-300 text-sm text-center">
              Some photos didn&apos;t upload — tap any marked photo to retry.
            </p>
          )}

          {!allDone && (
            <button
              onClick={onUpload}
              disabled={isUploading}
              className="tap-target w-full bg-accent text-ink-950 font-semibold text-lg rounded-2xl px-6 py-4 disabled:opacity-60 active:scale-[0.98] transition-transform"
            >
              {isUploading ? "Uploading…" : `Upload ${items.length} Photo${items.length !== 1 ? "s" : ""}`}
            </button>
          )}

          {!isUploading && !allDone && (
            <button
              onClick={onCancel}
              className="tap-target w-full text-white/60 font-medium text-base rounded-2xl px-6 py-3"
            >
              Cancel
            </button>
          )}

          {allDone && (
            <button
              onClick={onCancel}
              className="tap-target w-full bg-white/10 border border-white/20 text-white font-semibold text-lg rounded-2xl px-6 py-4"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
