"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_EVENT_LIMITS, EVENT_LIMIT_CAPS, limitHint } from "@/lib/limits";

/**
 * A client creating their own event.
 *
 * The caps advertised here come from the same EVENT_LIMIT_CAPS object the
 * server validates against, so what the form promises and what the API
 * accepts can't drift. Values outside the range are rejected with the
 * server's message rather than being quietly clamped — a host who asked for
 * 5 000 photos and was silently given 1 000 would blame the product when the
 * gallery stopped accepting uploads mid-event.
 */
export function CreateEventForm() {
  const router = useRouter();
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [uploadLimit, setUploadLimit] = useState<number | "">(DEFAULT_EVENT_LIMITS.uploadLimit);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState<number | "">(DEFAULT_EVENT_LIMITS.maxFileSizeMb);
  const [maxFilesPerUpload, setMaxFilesPerUpload] = useState<number | "">(
    DEFAULT_EVENT_LIMITS.maxFilesPerUpload
  );
  const [visibility, setVisibility] = useState("shared");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventDate: eventDate || undefined,
        visibility,
        uploadLimit: uploadLimit === "" ? undefined : uploadLimit,
        maxFileSizeMb: maxFileSizeMb === "" ? undefined : maxFileSizeMb,
        maxFilesPerUpload: maxFilesPerUpload === "" ? undefined : maxFilesPerUpload,
      }),
    });

    const body = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(body.error ?? "Could not create your event.");
      return;
    }

    router.push(`/dashboard/events/${body.event.event_code}`);
    router.refresh();
  }

  const inputClass =
    "w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 outline-none focus:border-accent";

  return (
    <form
      id="new-event"
      onSubmit={handleSubmit}
      className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4"
    >
      <h2 className="font-medium">Create an event</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm text-white/60 mb-1.5">Event name</span>
          <input
            required
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Thabo & Lerato's Wedding"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="block text-sm text-white/60 mb-1.5">Event date</span>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <LimitField
          label={EVENT_LIMIT_CAPS.uploadLimit.label}
          hint={limitHint("uploadLimit")}
          ruleKey="uploadLimit"
          value={uploadLimit}
          onChange={setUploadLimit}
        />
        <LimitField
          label={EVENT_LIMIT_CAPS.maxFileSizeMb.label}
          hint={limitHint("maxFileSizeMb")}
          ruleKey="maxFileSizeMb"
          value={maxFileSizeMb}
          onChange={setMaxFileSizeMb}
        />
        <LimitField
          label={EVENT_LIMIT_CAPS.maxFilesPerUpload.label}
          hint={limitHint("maxFilesPerUpload")}
          ruleKey="maxFilesPerUpload"
          value={maxFilesPerUpload}
          onChange={setMaxFilesPerUpload}
        />
      </div>

      <label className="block">
        <span className="block text-sm text-white/60 mb-1.5">Who can see the gallery</span>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          className={inputClass}
        >
          <option value="shared">Shared — anyone with your event link can view it</option>
          <option value="private">Private — only you can view it</option>
          <option value="public">Public — may be shared or indexed publicly</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={busy}
        className="bg-accent text-ink-950 font-semibold rounded-lg px-5 py-2.5 text-sm disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}

function LimitField({
  label,
  hint,
  ruleKey,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  ruleKey: "uploadLimit" | "maxFileSizeMb" | "maxFilesPerUpload";
  value: number | "";
  onChange: (value: number | "") => void;
}) {
  const rule = EVENT_LIMIT_CAPS[ruleKey];
  return (
    <label className="block">
      <span className="block text-sm text-white/60 mb-1.5">
        {label}
        <span className="block text-xs text-white/35">{hint}</span>
      </span>
      <input
        type="number"
        min={rule.min}
        max={rule.max}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 outline-none focus:border-accent"
      />
    </label>
  );
}
