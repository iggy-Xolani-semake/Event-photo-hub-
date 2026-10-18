# PayFast Setup

Checkout uses PayFast's hosted payment page. Card details stay with PayFast; the
app only receives an ITN and unlocks downloads after validating it.

## Configure

Add these server-side variables in Netlify (and `.env.local` for local work):

- `PAYFAST_MODE`: `sandbox` while testing; `live` only after a successful sandbox test.
- `PAYFAST_MERCHANT_ID`: the 8-digit merchant ID for the selected environment.
- `PAYFAST_MERCHANT_KEY`: the merchant key for that environment.
- `PAYFAST_PASSPHRASE`: optional passphrase configured in PayFast. It must match exactly.
- `NEXT_PUBLIC_APP_URL`: the canonical HTTPS site URL for live payments.

Use Sandbox credentials with `PAYFAST_MODE=sandbox`. Use live credentials only
with `PAYFAST_MODE=live`. Never commit real credentials or send them in chat.

The app supplies the `notify_url` per checkout at
`/api/payments/payfast/itn`; no client-side return page can mark a payment paid.
The ITN route checks the PayFast signature and source IP, verifies merchant and
amount against the pending ZAR payment, asks PayFast to validate the notification,
then calls the existing service-role-only `mark_event_paid()` function.

PayFast checkout is ZAR-only and rejects amounts below R5.00. After sandbox
checkout succeeds, confirm the payment ITN arrived and downloads unlocked before
switching the Netlify production variables to live credentials and mode.