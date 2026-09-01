"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [uploadLimit, setUploadLimit] = useState(500);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(15);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventDate: eventDate || undefined,
        clientName,
        clientEmail,
        clientPhone: clientPhone || undefined,
        uploadLimit,
        maxFileSizeMb,
      }),
    });

    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }

    router.push(`/admin/events/${body.event.event_code}`);
  }

  return (
    <main className="p-6 md:p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl mb-1">Create Event</h1>
      <p className="text-white/50 text-sm mb-8">
        Generates a unique event code, guest upload link, and QR code.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <Field label="Event name" required>
          <input
            required
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Thabo & Lerato"
            className="input"
          />
        </Field>

        <Field label="Event date">
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="input"
          />
        </Field>

        <div className="border-t border-white/10 pt-5">
          <p className="text-sm font-medium text-white/70 mb-4">Client details</p>

          <Field label="Client name" required>
            <input
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Client email" required>
            <input
              type="email"
              required
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Client phone">
            <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="input" />
          </Field>
        </div>

        <div className="border-t border-white/10 pt-5">
          <p className="text-sm font-medium text-white/70 mb-4">Limits</p>

          <Field label="Photo limit">
            <input
              type="number"
              min={1}
              value={uploadLimit}
              onChange={(e) => setUploadLimit(Number(e.target.value))}
              className="input"
            />
          </Field>

          <Field label="Max file size (MB)">
            <input
              type="number"
              min={1}
              max={50}
              value={maxFileSizeMb}
              onChange={(e) => setMaxFileSizeMb(Number(e.target.value))}
              className="input"
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-ink-950 font-semibold rounded-xl px-6 py-3 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create Event"}
        </button>
      </form>

      <style jsx global>{`
        .input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          outline: none;
        }
        .input:focus {
          border-color: #d4af37;
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block mb-4">
      <span className="block text-sm text-white/70 mb-1.5">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      {children}
    </label>
  );
}
