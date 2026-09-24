import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import type { Config } from "@netlify/functions";

const REMINDER_STAGES = [7, 2];
const DAY_MS = 86_400_000;

interface EventReminderRow {
  id: string;
  event_code: string;
  event_name: string;
  gallery_expires_at: string;
  reminder_stages_sent: number[] | null;
  client: { email: string; name: string } | null;
}

export default async function customerReminders(): Promise<void> {
  const supabaseUrl = Netlify.env.get("SUPABASE_URL");
  const serviceRoleKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Netlify.env.get("RESEND_API_KEY");
  const from = Netlify.env.get("RESEND_FROM_EMAIL");
  const appUrl = (Netlify.env.get("NEXT_PUBLIC_APP_URL") ?? "").replace(/\/$/, "");

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !from || !appUrl) {
    throw new Error(
      "Customer reminders require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL, and NEXT_PUBLIC_APP_URL."
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const resend = new Resend(resendApiKey);

  const { data, error } = await admin
    .from("events")
    .select(
      "id, event_code, event_name, gallery_expires_at, reminder_stages_sent, client:clients(email, name)"
    )
    .gt("gallery_expires_at", new Date().toISOString())
    .not("client_id", "is", null)
    .limit(500);

  if (error) throw new Error(`Could not load reminder events: ${error.message}`);

  for (const event of (data ?? []) as EventReminderRow[]) {
    const expiry = new Date(event.gallery_expires_at);
    const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / DAY_MS);
    const sentStages = event.reminder_stages_sent ?? [];
    const stage = REMINDER_STAGES.find((days) => daysLeft <= days && !sentStages.includes(days));
    const recipient = event.client?.email?.trim();

    if (!stage || !recipient) continue;

    const galleryUrl = `${appUrl}/e/${encodeURIComponent(event.event_code)}`;
    const deletionDate = expiry.toLocaleDateString("en-ZA", {
      dateStyle: "full",
      timeZone: "Africa/Johannesburg",
    });
    const subject = `${event.event_name} photos expire in ${Math.max(daysLeft, 0)} day${daysLeft === 1 ? "" : "s"}`;

    const { error: sendError } = await resend.emails.send({
      from,
      to: [recipient],
      subject,
      text: [
        `Hi ${event.client?.name || "there"},`,
        "",
        `Your Memora gallery for ${event.event_name} expires on ${deletionDate}.`,
        "After that date, the gallery and stored photos are permanently deleted.",
        "",
        `Open your gallery: ${galleryUrl}`,
        "",
        "Please download anything you want to keep before the expiry date.",
      ].join("\n"),
      html: `
        <p>Hi ${escapeHtml(event.client?.name || "there")},</p>
        <p>Your Memora gallery for <strong>${escapeHtml(event.event_name)}</strong> expires on <strong>${escapeHtml(deletionDate)}</strong>.</p>
        <p>After that date, the gallery and stored photos are permanently deleted.</p>
        <p><a href="${escapeHtml(galleryUrl)}">Open your gallery</a></p>
        <p>Please download anything you want to keep before the expiry date.</p>
      `,
      tags: [
        { name: "type", value: "gallery-expiry-reminder" },
        { name: "stage", value: String(stage) },
        { name: "event_code", value: event.event_code },
      ],
    });

    if (sendError) {
      console.error("Customer reminder failed", { eventId: event.id, sendError });
      continue;
    }

    const { error: markError } = await admin
      .from("events")
      .update({ reminder_stages_sent: [...sentStages, stage] })
      .eq("id", event.id)
      .not("reminder_stages_sent", "cs", `{${stage}}`);

    if (markError) {
      console.error("Could not record customer reminder stage", { eventId: event.id, markError });
    }
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

export const config: Config = {
  schedule: "0 6 * * *",
};
