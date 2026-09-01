"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EventStatus } from "@/types/database";

export function EventStatusControls({ eventCode, status }: { eventCode: string; status: EventStatus }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(newStatus: EventStatus) {
    if (newStatus === "closed" && !confirm("Close this event? Guests will no longer be able to upload photos.")) {
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/admin/events/${eventCode}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
    else alert("Could not update event status.");
  }

  if (status === "active") {
    return (
      <button
        onClick={() => updateStatus("closed")}
        disabled={loading}
        className="text-sm bg-white/10 border border-white/20 rounded-lg px-4 py-2 disabled:opacity-60"
      >
        Close Event
      </button>
    );
  }

  if (status === "closed") {
    return (
      <div className="flex gap-2">
        <span className="text-xs font-medium bg-amber-500/20 text-amber-300 rounded-full px-3 py-1.5 self-center">
          Closed
        </span>
        <button
          onClick={() => updateStatus("active")}
          disabled={loading}
          className="text-sm bg-accent text-ink-950 font-semibold rounded-lg px-4 py-2 disabled:opacity-60"
        >
          Reopen Event
        </button>
      </div>
    );
  }

  return <span className="text-xs font-medium bg-white/10 text-white/50 rounded-full px-3 py-1.5">Archived</span>;
}
