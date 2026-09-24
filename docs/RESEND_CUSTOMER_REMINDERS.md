# Customer expiry reminders

Memora sends customer reminders to the event client's email address before the event gallery expires. The scheduled function runs daily at **06:00 UTC** and currently sends reminders at **7 days** and **2 days** before `events.gallery_expires_at`.

The reminder includes the exact gallery expiry date, a direct gallery link, and a warning that deletion is permanent. Delivery stages are stored in `events.reminder_stages_sent`, so a successfully accepted reminder is not sent again. If Resend returns an error, the stage is not recorded and a later scheduled run can retry it.

## Required Netlify variables

Set these as server-only Netlify environment variables:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side database access; never expose it to the browser |
| `RESEND_API_KEY` | Resend sending key |
| `RESEND_FROM_EMAIL` | A `From` address on a verified Resend domain, for example `Memora <reminders@mail.example.com>` |
| `NEXT_PUBLIC_APP_URL` | Production application URL used in reminder links |

The Resend connector currently uses a **send-only restricted key**, so domain listing and verification cannot be inspected through the connector. Confirm that the configured `RESEND_FROM_EMAIL` domain is verified in Resend before publishing.

## Database prerequisite

Apply `supabase/migrations/0021_customer_expiry_reminders.sql` to the connected Supabase project. It adds the idempotency column and an expiry index. The migration is additive and does not delete or rewrite event data.

## Function

The scheduled function is `netlify/functions/customer-reminders.mts`. It uses the Netlify scheduled-function configuration:

```ts
export const config = { schedule: "0 6 * * *" };
```

Scheduled functions run only on published Netlify deploys. To test locally with the Netlify CLI, invoke the function using `netlify functions:invoke customer-reminders` after supplying the required environment variables in the local environment.
