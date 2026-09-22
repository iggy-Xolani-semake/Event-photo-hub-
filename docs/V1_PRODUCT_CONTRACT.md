# Memora V1 Product Contract

## Primary customer

The paying customer is the event owner. An owner may be an event organiser or a photographer, but those are not separate product roles in V1. The owner can manage only events they created or own through their authenticated account.

Guests do not create accounts. They use the event QR code or link to view previews and optionally upload photos.

## Access and permissions

- Event codes and QR links are discovery conveniences, not authorization for originals.
- Guests receive no original download permission and no enlarged viewer.
- Guests see only the event's 4-column-style thumbnail gallery and may upload while the upload window is open.
- The owner sees enlarged previews and individual or bulk download controls only after the event package is paid.
- Every original download is checked server-side against owner identity and `download_unlocked_at`.
- Originals are never public R2 objects.

V1 still uses the event link as the guest capability. A future invitation upgrade should issue revocable per-guest capabilities for private events and moderation-sensitive workflows.

## V1 limits

- Maximum 500 photos per event.
- Maximum 15 MB per photo.
- Maximum 10 photos in one guest upload batch.
- Existing per-guest quota remains a separate abuse-control limit.

## Expiry and retention

- Uploads close automatically 7 days after event creation.
- Gallery viewing expires automatically 30 days after event creation.
- Expiry stops viewing or uploading only; it does not delete photos, originals, variants, or backups.
- Paid download access does not expire in V1.
- The owner may later receive an extension workflow; no automatic deletion is implemented.

## Processing state

A photo becomes visible to other viewers only after the processing worker has produced validated gallery and thumbnail variants. The uploader sees the upload progress and processing state; failed or hidden photos are not shown in the guest gallery.

## Operational follow-up

The next access-control iteration should add signed guest capabilities for private events, revocation, malware scanning, idempotency keys, resumable multipart uploads, and a durable processing queue. Those are separate from the V1 product contract and should not be implied by the current event link.
