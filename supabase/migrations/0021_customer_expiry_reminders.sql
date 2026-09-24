-- 0021 — customer expiry reminder delivery tracking
-- The scheduled Netlify function records each reminder stage only after Resend
-- accepts the message, so a transient email failure is retried on a later run.

alter table public.events
  add column if not exists reminder_stages_sent integer[] not null default '{}';

comment on column public.events.reminder_stages_sent is
  'Gallery-expiry reminder stages already accepted by Resend, expressed as days remaining (7 or 2).';

create index if not exists events_gallery_expiry_reminders_idx
  on public.events (gallery_expires_at)
  where gallery_expires_at is not null;
