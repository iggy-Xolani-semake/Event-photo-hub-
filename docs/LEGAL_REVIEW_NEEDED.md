# Legal Review Needed — Privacy Policy

The privacy policy at `src/app/privacy/page.tsx` was drafted to cover the
right *topics* for a photo-sharing platform under POPIA (South Africa's
Protection of Personal Information Act), but it is **not a substitute
for actual legal advice**. Claude is not a lawyer and this should not be
treated as legal sign-off.

Before using this with real, paying-client events, get a South African
legal or POPIA compliance advisor to confirm:

1. **Responsible party vs. operator status.** Whether NSX Inc is acting
   as POPIA's "responsible party" (deciding what happens with the data)
   or an "operator" (processing on the client's instructions) may differ
   event-to-event depending on your actual contract terms with each
   client. This changes which obligations legally fall on NSX vs. the
   client, and the current draft hedges on this rather than committing
   to a specific answer — that hedge should be resolved, not left as-is
   long-term.

2. **Cross-border data transfer.** Confirm which actual Supabase and
   Cloudflare R2 regions you're using in production, and whether
   POPIA's Section 72 conditions for transferring personal information
   outside South Africa are satisfied (e.g. via the provider's own data
   processing agreements/compliance certifications). The current draft
   flags this as unconfirmed rather than asserting compliance.

3. **Retention period.** The current draft says photos are kept "for as
   long as the event remains active... and a reasonable period
   afterward" — vague on purpose, since no retention policy has been
   decided yet. Once you have an actual policy (e.g. "photos are
   deleted 12 months after event closure unless the client requests
   otherwise"), update this section to state it concretely.

4. **Contact details.** The policy currently has a placeholder
   `[NSX Inc contact email]` — fill in a real, monitored inbox before
   publishing.

5. **Consent for photos of third parties.** The "Photos of other
   people" section reflects a common, pragmatic approach for
   event-photography platforms (the uploader affirms they have a
   reasonable basis to share), but whether this is sufficient under
   POPIA specifically — versus needing e.g. signage at the event, or
   host-level consent collection — is worth confirming for your
   specific risk tolerance, especially once "public" visibility events
   are in real use.

## What this doc is NOT

This is not legal advice, and finishing this checklist is not the same
as being POPIA-compliant. It's a list of the specific open questions
Claude identified while drafting — treat it as a starting brief for
whoever you engage to review this properly.
