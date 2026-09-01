# Cloudflare R2 Setup

> **Status for this project:** bucket created (`event-photo-hub`, ENAM
> region, Standard storage class) and Public Development URL enabled
> (`pub-d8855cfb7a324a58a575892c9d277774.r2.dev`). Still outstanding on
> your end: the scoped API token (step 2) and the CORS policy (step 4) —
> both require actions in the Cloudflare dashboard that generate secrets
> or set access rules, which can't be done through the management
> connector for security reasons.

## 1. Create the bucket

1. Cloudflare dashboard → R2 → **Create bucket**.
2. Name it (e.g. `event-photo-hub`). Note this in `R2_BUCKET_NAME`.
3. Note your **Account ID** (shown in the R2 overview page, or the right
   sidebar of any Cloudflare dashboard page) → `R2_ACCOUNT_ID`.

## 2. Create a scoped API token

**Do not use an account-wide token.** R2 → Manage R2 API Tokens → Create
API Token:

- Permissions: **Object Read & Write**
- Scope: **Apply to specific buckets only** → select your bucket
- TTL: no expiry (rotate manually per your own security policy) or set
  one and rotate on schedule

Save the **Access Key ID** and **Secret Access Key** shown once at
creation — into `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`. These are
server-only secrets; they are read exclusively by
`src/lib/storage/r2Client.ts`, which is guarded with `import "server-only"`
so importing it from client code is a build error, not just a convention.

## 3. Enable public access for gallery/thumbnail variants

Originals stay private (served only via short-lived presigned URLs — see
"How the upload flow works" in the main README). Gallery and thumbnail
images are served directly from a public URL since they're displayed in
bulk in a masonry grid, where presigning hundreds of URLs per page load
would be wasted overhead for images that don't carry sensitive
full-resolution data anyway.

Pick one:

**Option A — R2.dev subdomain (fastest to set up, fine for testing/small deployments):**
1. Bucket → Settings → Public Access → **Allow Access** → enables a
   `pub-xxxxxxxx.r2.dev` subdomain.
2. Set `NEXT_PUBLIC_R2_PUBLIC_HOST=pub-xxxxxxxx.r2.dev`.

**Option B — Custom domain (recommended for production):**
1. Bucket → Settings → Custom Domains → **Connect Domain** →
   e.g. `photos-cdn.yourdomain.com` (requires the domain to already be on
   Cloudflare).
2. Set `NEXT_PUBLIC_R2_PUBLIC_HOST=photos-cdn.yourdomain.com`.

If you'd rather keep galleries fully private even for the "shared"/"public"
visibility tiers, skip this step and instead swap `publicImageUrl()` in
`src/lib/storage/publicUrl.ts` for a call to `createPresignedDownloadUrl()`
— the storage paths and schema don't change, only how the URL is built.

## 4. Configure CORS (required for browser uploads)

The browser PUTs file bytes directly to R2 using a presigned URL — this
is a cross-origin request from your app's domain to R2's endpoint, so R2
needs a CORS policy that allows it.

Bucket → Settings → CORS Policy → add:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Update `AllowedOrigins` with every domain guests will actually upload
from (production domain, any preview/staging domains, and localhost for
dev). A missing origin here is the most common cause of "upload just
hangs on mobile" during testing — the presigned URL is valid but the
browser blocks the request before it ever reaches R2.

## 5. Lifecycle rules (optional, cost control)

If you want to automatically age out very old/closed events' original
files to cheaper storage or delete them after a retention period, R2
supports lifecycle rules under Bucket → Settings → Object Lifecycle
Rules, scoped by prefix (e.g. `events/*/original/`). Not required for V1
— worth revisiting once you have real usage data on storage growth.
