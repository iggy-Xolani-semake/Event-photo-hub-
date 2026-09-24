"use client";

import { useState } from "react";
import { formatEventDate } from "@/lib/format";
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
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const formattedDate = formatEventDate(eventDate);

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
    <div className="sticky top-0 z-10 mb-3 border-b border-white/10 bg-ink-950/90 px-4 py-3 backdrop-blur-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl">{eventName}</h1>
          {formattedDate && <p className="truncate text-xs text-white/40">{formattedDate}</p>}
        </div>
        <button
          onClick={onToggleSelectMode}
          className="shrink-0 rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/60"
        >
          {selectMode ? "Cancel" : "Select"}
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm">
        <button
          onClick={() => onTabChange("all")}
          className={`rounded-full px-3 py-1.5 ${tab === "all" ? "bg-white font-medium text-ink-950" : "text-white/60"}`}
        >
          All Memories: {totalCount}
        </button>
        <button
          onClick={() => onTabChange("favourites")}
          className={`rounded-full px-3 py-1.5 ${tab === "favourites" ? "bg-white font-medium text-ink-950" : "text-white/60"}`}
        >
          ❤️ Favourites: {favouriteCount}
        </button>
      </div>

      {downloadStatus && (
        <p className="mb-2 text-xs text-white/60" aria-live="polite">
          {downloadStatus}
        </p>
      )}

      {canDownload && selectMode && selectedCount > 0 && (
        <button
          onClick={() => handleDownload("selected")}
          disabled={downloading}
          className="tap-target w-full rounded-xl bg-accent px-4 py-2.5 font-semibold text-ink-950 disabled:opacity-60"
        >
          {downloading ? "Preparing…" : `Download ${selectedCount} Selected`}
        </button>
      )}

      {canDownload && !selectMode && (
        <button
          onClick={() => handleDownload(tab === "favourites" ? "favourites" : "all")}
          disabled={downloading}
          className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm disabled:opacity-60"
        >
          {downloading ? "Preparing…" : tab === "favourites" ? "Download Favourites" : "Download All Memories"}
        </button>
      )}
    </div>
  );
}
