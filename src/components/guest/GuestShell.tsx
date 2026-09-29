import { Camera, Images, Upload } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SkipLink } from "@/components/ui/SkipLink";

/**
 * The guest viewport shell: an ultra-clean, single-hand mobile layout.
 *
 *  - Minimal sticky header: host branding/avatar + event name, nothing else.
 *  - Content column capped at max-w-md so thumbs stay near the bottom bar.
 *  - A fixed floating bottom action bar carries the primary actions
 *    ([Take Photo] [Upload] [View Gallery]) on every interactive screen,
 *    because on a phone the thumb never climbs to the top of the page.
 *
 * Has no "use client" directive on purpose: rendered from the server page it
 * is plain markup, and when a client screen passes onClick handlers it simply
 * joins the client bundle.
 */

interface GuestShellProps {
  eventName: string;
  brandCompanyName?: string | null;
  children: ReactNode;
  actionBar?: ReactNode;
}

export function GuestShell({ eventName, brandCompanyName, children, actionBar }: GuestShellProps) {
  const initials = (brandCompanyName ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-canvas">
      <SkipLink />
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <span className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg shadow-indigo-500/25">
            {initials || <Camera className="h-4 w-4" strokeWidth={2.4} />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{eventName}</p>
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {brandCompanyName ? `Hosted by ${brandCompanyName}` : "Hosted on Memora"}
            </p>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className={actionBar ? "pb-32 focus:outline-none" : "pb-10 focus:outline-none"}>{children}</main>

      {actionBar}
    </div>
  );
}

interface GuestActionBarProps {
  onTakePhoto: () => void;
  onUpload: () => void;
  galleryHref: string;
  galleryAvailable: boolean;
}

/** The fixed floating bottom action bar: [Take Photo] [Upload] [View Gallery]. */
export function GuestActionBar({
  onTakePhoto,
  onUpload,
  galleryHref,
  galleryAvailable,
}: GuestActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-canvas via-canvas/90 to-transparent" aria-hidden="true" />
      <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-2 shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={onTakePhoto}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3 text-sm font-medium text-slate-200 transition-all hover:bg-slate-800 active:scale-[0.98]"
        >
          <Camera className="h-4 w-4" strokeWidth={2.2} />
          Take Photo
        </button>

        <button
          type="button"
          onClick={onUpload}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
        >
          <Upload className="h-4 w-4" strokeWidth={2.2} />
          Upload
        </button>

        {galleryAvailable && (
          <Link
            href={galleryHref}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/60 hover:text-white"
          >
            <Images className="h-4 w-4" strokeWidth={2.2} />
            Gallery
          </Link>
        )}
      </div>
    </div>
  );
}
