"use client";

import { useState } from "react";

interface Props {
  eventName: string;
  eventCode: string;
  tab: "all" | "favourites";
  onTabChange: (tab: "all" | "favourites") => void;
  totalCount: number;
  favouriteCount: number;
  selectMode: boolean;
  onToggleSelectMode: () => void;
  selectedCount: number;
  selectedIds: string[];
}

export function GalleryToolbar({
  eventName,
  eventCode,
  tab,
  onTabChange,
  totalCount,
  favouriteCount,
  selectMode,
  onToggleSelectMode,
  selectedCount,
  selectedIds,
}: Props) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload(scope: "all" | "favourites" | "selected") {
    setDownloading(true);
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
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${eventCode}-${scope}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="sticky top-0 z-10 bg-ink-950/90 backdrop-blur-md border-b border-white/10 px-4 py-3 mb-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-display text-xl truncate">{eventName}</h1>
        <button
          onClick={onToggleSelectMode}
          className="text-sm text-white/60 border border-white/20 rounded-full px-3 py-1.5 shrink-0"
        >
          {selectMode ? "Cancel" : "Select"}
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm mb-3">
        <button
          onClick={() => onTabChange("all")}
          className={`rounded-full px-3 py-1.5 ${tab === "all" ? "bg-white text-ink-950 font-medium" : "text-white/60"}`}
        >
          All Photos: {totalCount}
        </button>
        <button
          onClick={() => onTabChange("favourites")}
          className={`rounded-full px-3 py-1.5 ${tab === "favourites" ? "bg-white text-ink-950 font-medium" : "text-white/60"}`}
        >
          ❤️ Favourites: {favouriteCount}
        </button>
      </div>

      {selectMode && selectedCount > 0 ? (
        <button
          onClick={() => handleDownload("selected")}
          disabled={downloading}
          className="tap-target w-full bg-accent text-ink-950 font-semibold rounded-xl px-4 py-2.5 disabled:opacity-60"
        >
          {downloading ? "Preparing…" : `Download ${selectedCount} Selected`}
        </button>
      ) : (
        !selectMode && (
          <div className="flex gap-2">
            <button
              onClick={() => handleDownload(tab === "favourites" ? "favourites" : "all")}
              disabled={downloading}
              className="flex-1 bg-white/10 border border-white/20 text-sm rounded-xl px-3 py-2 disabled:opacity-60"
            >
              {downloading
                ? "Preparing…"
                : tab === "favourites"
                  ? "Download Favourites"
                  : "Download All"}
            </button>
          </div>
        )
      )}
    </div>
  );
}
