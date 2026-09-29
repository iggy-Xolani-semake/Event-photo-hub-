"use client";

import { Heart, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatEventDate } from "@/lib/format";
import { GUEST_CANNOT_DOWNLOAD_NOTE } from "@/lib/guest/photoRights";
import { downloadZipPart, type ZipProgress } from "@/lib/download/streamZip";
import type { DownloadManifestPart } from "@/lib/download/types";

interface Props {
  eventName: string;
  eventDate?: string | null;
  eventCode: string;
  tab: "all" | "favourites";
  onTabChange: (tab: "all" | "favourites") => void;
  totalCount: number;
  favouriteCount: number;
  selectMode: boolean;
  onToggleSelectMode: () => void;
  selectedCount: number;
  selectedIds: string[];
  /** Only the host of a paid event (or staff) may take files out. */
  canDownload: boolean;
  /** Owner/admin only: unlocks the destructive "delete all" control. */
  canManage?: boolean;
}

interface DownloadManifest {
  eventCode: string;
  scope: "all" | "favourites" | "selected";
  parts: DownloadManifestPart[];
}

export function GalleryToolbar({
  eventName,
  eventDate = null,
  eventCode,
  tab,
  onTabChange,
  totalCount,
  favouriteCount,
  selectMode,
  onToggleSelectMode,
  selectedCount,
  selectedIds,
  canDownload,
  canManage = false,
}: Props) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<"idle" | "confirm" | "busy">("idle");
  const formattedDate = formatEventDate(eventDate);

  /**
   * "Delete all" — two-step confirm, then DELETE /api/events/[code]/photos.
   * The route re-checks ownership through RLS, so this button being visible
   * is never the actual security boundary.
   */
  async function handleDeleteAll() {
    setDeleteState("busy");
    setDownloadStatus("Deleting all photos…");
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventCode)}/photos`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => ({}))) as {
        deleted?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Delete failed");
      setDownloadStatus(
        body.deleted
          ? `Deleted ${body.deleted} photo${body.deleted === 1 ? "" : "s"} and their files.`
          : "The gallery was already empty."
      );
      setDeleteState("idle");
      router.refresh();
    } catch (err) {
      setDownloadStatus(err instanceof Error ? err.message : "Delete failed. Please try again.");
      setDeleteState("confirm");
    }
  }

  async function handleDownload(scope: "all" | "favourites" | "selected") {
    setDownloading(true);
    setDownloadStatus("Preparing download parts…");
    try {
      const res = await fetch("/api/download/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCode,
          scope,
          photoIds: scope === "selected" ? selectedIds : undefined,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as DownloadManifest & { error?: string };
      if (!res.ok || !payload.parts?.length) throw new Error(payload.error ?? "Download failed");

      const totalBytes = payload.parts.reduce((sum, part) => sum + part.estimatedBytes, 0);
      if (totalBytes > 500 * 1024 * 1024) {
        const sizeGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(1);
        const confirmed = window.confirm(
          `This download is about ${sizeGb} GB and will arrive as ${payload.parts.length} ZIP files of about 150 MB each. Continue?`
        );
        if (!confirmed) return;
      }

      for (const part of payload.parts) {
        const filename = `${eventCode}-${scope}-part-${part.part}-of-${part.totalParts}.zip`;
        setDownloadStatus(`Building ZIP ${part.part} of ${part.totalParts}…`);
        await downloadZipPart(part, filename, (progress: ZipProgress) => {
          setDownloadStatus(
            `Building ZIP ${progress.part} of ${progress.totalParts} (${progress.completedFiles}/${progress.totalFiles} photos)…`
          );
        });
      }
      setDownloadStatus(`Downloaded ${payload.parts.length} ZIP ${payload.parts.length === 1 ? "file" : "files"}.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("bulk download failed", error);
      setDownloadStatus("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="sticky top-0 z-10 mb-3 border-b border-slate-800 bg-canvas/90 px-4 py-3 backdrop-blur-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-slate-100">{eventName}</h1>
          {formattedDate && <p className="truncate text-xs text-slate-500">{formattedDate}</p>}
        </div>
        <button
          onClick={onToggleSelectMode}
          className="shrink-0 rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          {selectMode ? "Cancel" : "Select"}
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm">
        <button
          onClick={() => onTabChange("all")}
          className={`rounded-full px-3 py-1.5 ${tab === "all" ? "bg-violet-600/90 font-medium text-white" : "text-slate-400"}`}
        >
          All Memories: {totalCount}
        </button>
        <button
          onClick={() => onTabChange("favourites")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${tab === "favourites" ? "bg-violet-600/90 font-medium text-white" : "text-slate-400"}`}
        >
          <Heart className={`h-3.5 w-3.5 ${tab === "favourites" ? "fill-current" : ""}`} strokeWidth={2.2} />
          Favourites: {favouriteCount}
        </button>
      </div>

      {!canDownload && (
        <p className="mb-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
          {canManage
            ? "Preview gallery — full-size viewing and downloads unlock after the event package is paid."
            : GUEST_CANNOT_DOWNLOAD_NOTE}
        </p>
      )}

      {downloadStatus && (
        <p className="mb-2 text-xs text-slate-400" aria-live="polite">
          {downloadStatus}
        </p>
      )}

      {canDownload && selectMode && selectedCount > 0 && (
        <button
          onClick={() => handleDownload("selected")}
          disabled={downloading}
          className="tap-target w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {downloading ? "Preparing…" : `Download ${selectedCount} Selected`}
        </button>
      )}

      {canDownload && !selectMode && (
        <button
          onClick={() => handleDownload(tab === "favourites" ? "favourites" : "all")}
          disabled={downloading}
          className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm disabled:opacity-60"
        >
          {downloading ? "Preparing…" : tab === "favourites" ? "Download Favourites" : "Download All Memories"}
        </button>
      )}

      {canManage && !selectMode && totalCount > 0 && (
        deleteState === "confirm" ? (
          <div
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3"
            role="alertdialog"
            aria-label="Confirm deleting all photos"
          >
            <p className="text-sm font-medium text-rose-200">
              Delete all {totalCount} photo{totalCount === 1 ? "" : "s"}?
            </p>
            <p className="mt-1 text-xs text-rose-300/80">
              This permanently removes every photo and its files. It cannot be undone.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleDeleteAll}
                className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
              >
                Delete everything
              </button>
              <button
                onClick={() => setDeleteState("idle")}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                Keep them
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setDeleteState("confirm")}
            disabled={deleteState === "busy"}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2.2} />
            {deleteState === "busy" ? "Deleting…" : "Delete All Memories"}
          </button>
        )
      )}
    </div>
  );
}
