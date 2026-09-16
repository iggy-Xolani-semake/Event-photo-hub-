"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EVENT_LIMIT_CAPS, limitHint } from "@/lib/limits";
import type { Event } from "@/types/database";

interface Props {
  event: Event;
  /**
   * Where the save goes. Defaults to the admin-only settings route; the
   * client dashboard passes /api/events/{code}, which authorises through
   * ownership RLS instead of requireAdmin().
   */
  endpoint?: string;
}

export function EventSettingsForm({ event, endpoint }: Props) {
  const router = useRouter();
  const [eventName, setEventName] = useState(event.event_name);
  const [eventDate, setEventDate] = useState(event.event_date ?? "");
  const [uploadLimit, setUploadLimit] = useState(event.upload_limit);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(Math.round(event.max_file_size_bytes / (1024 * 1024)));
  const [maxFilesPerUpload, setMaxFilesPerUpload] = useState(event.max_files_per_upload);
  const [visibility, setVisibility] = useState(event.visibility);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveUrl = endpoint ?? `/api/admin/events/${event.event_code}/settings`;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const res = await fetch(saveUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventDate: eventDate || null,
        uploadLimit,
        maxFileSizeMb,
        maxFilesPerUpload,
        visibility,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } else {
      // The server validates against the same caps these fields advertise, so
      // its message is the useful one — show it instead of a generic alert.
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not save settings.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm text-white/60 mb-1.5">Event name</span>
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="block text-sm text-white/60 mb-1.5">Event date</span>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 outline-none focus:border-accent"
          />
        </label>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <label className="block">
          <span className="block text-sm text-white/60 mb-1.5">
            {EVENT_LIMIT_CAPS.uploadLimit.label}
            <span className="block text-xs text-white/35">{limitHint("uploadLimit")}</span>
          </span>
          <input
            type="number"
            min={EVENT_LIMIT_CAPS.uploadLimit.min}
            max={EVENT_LIMIT_CAPS.uploadLimit.max}
            value={uploadLimit}
            onChange={(e) => setUploadLimit(Number(e.target.value))}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="block text-sm text-white/60 mb-1.5">
            {EVENT_LIMIT_CAPS.maxFileSizeMb.label}
            <span className="block text-xs text-white/35">{limitHint("maxFileSizeMb")}</span>
          </span>
          <input
            type="number"
            min={EVENT_LIMIT_CAPS.maxFileSizeMb.min}
            max={EVENT_LIMIT_CAPS.maxFileSizeMb.max}
            value={maxFileSizeMb}
            onChange={(e) => setMaxFileSizeMb(Number(e.target.value))}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="block text-sm text-white/60 mb-1.5">
            {EVENT_LIMIT_CAPS.maxFilesPerUpload.label}
            <span className="block text-xs text-white/35">{limitHint("maxFilesPerUpload")}</span>
          </span>
          <input
            type="number"
            min={EVENT_LIMIT_CAPS.maxFilesPerUpload.min}
            max={EVENT_LIMIT_CAPS.maxFilesPerUpload.max}
            value={maxFilesPerUpload}
            onChange={(e) => setMaxFilesPerUpload(Number(e.target.value))}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 outline-none focus:border-accent"
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm text-white/60 mb-1.5">Gallery visibility</span>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as typeof visibility)}
          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 outline-none focus:border-accent"
        >
          <option value="private">Private — only the client can view</option>
          <option value="shared">Shared — anyone with the link can view</option>
          <option value="public">Public — gallery may be indexed/shared publicly</option>
        </select>
      </label>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-accent text-ink-950 font-semibold rounded-lg px-5 py-2.5 text-sm disabled:opacity-60"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save Settings"}
      </button>
    </div>
  );
}
