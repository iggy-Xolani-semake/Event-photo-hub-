"use client";

import clsx from "clsx";
import {
  Clock3,
  Download,
  FileArchive,
  Globe2,
  Grid2x2,
  Heart,
  ImagePlus,
  List,
  Lock,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PhotoTile } from "./PhotoTile";

interface DesktopMockupProps {
  photos: number;
  guests: number;
  /** Photos that landed during the current demo cycle (0–3); drives the pop-in. */
  addedThisCycle: number;
  /** Bumped each cycle so freshly added tiles remount and replay their animation. */
  cycle: number;
  unlocked: boolean;
}

const TILE_COUNT = 12;

/**
 * The host side: a gallery that fills up while the event is still on, drawn as
 * a glass panel in the app's own surface language. Mirrors the real product
 * surfaces (visibility modes, upload window, WebP previews, gated original
 * ZIP) so the marketing claim and the app agree.
 */
export function DesktopMockup({
  photos,
  guests,
  addedThisCycle,
  cycle,
  unlocked,
}: DesktopMockupProps) {
  const newFrom = TILE_COUNT - Math.max(0, Math.min(addedThisCycle, TILE_COUNT));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-card-lg backdrop-blur-md">
      {/* browser chrome */}
      <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950/60 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <span className="flex max-w-[260px] items-center gap-1.5 truncate rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-[9px] font-medium text-slate-500">
            <Lock className="h-2.5 w-2.5 shrink-0 text-emerald-400" strokeWidth={2.5} />
            <span className="truncate">memora.app/g/AMR8THBQ</span>
          </span>
        </div>
        <Grid2x2 className="hidden h-3 w-3 text-slate-500 sm:block" strokeWidth={2.5} />
      </div>

      {/* gallery header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[13px] font-extrabold tracking-tight text-white sm:text-sm">
              Amara &amp; Thabo&apos;s Wedding
            </h3>
            <span className="hidden shrink-0 items-center gap-1 rounded-full border border-slate-700 px-1.5 py-[2px] text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400 sm:inline-flex">
              <Globe2 className="h-2.5 w-2.5" strokeWidth={2.5} />
              Shared
            </span>
          </div>
          <p className="mt-0.5 text-[9px] text-slate-500">Saturday, 14 March 2026 · Meadowbrook Estate</p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rose-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-rose-400 ring-1 ring-rose-500/30">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-rose-500" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
          </span>
          Live
        </span>
      </div>

      {/* stats strip */}
      <div className="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800">
        <Stat icon={<ImagePlus className="h-3 w-3" strokeWidth={2.5} />} value={String(photos)} label="Photos" />
        <Stat icon={<Users className="h-3 w-3" strokeWidth={2.5} />} value={String(guests)} label="Guests" />
        <Stat icon={<Clock3 className="h-3 w-3" strokeWidth={2.5} />} value="6d 23h" label="Uploads open" />
      </div>

      {/* toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-md bg-slate-700 px-2 py-1 text-[9px] font-semibold text-white">
            <Grid2x2 className="h-2.5 w-2.5" strokeWidth={2.5} />
            Grid
          </span>
          <span className="flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-semibold text-slate-400">
            <List className="h-2.5 w-2.5" strokeWidth={2.5} />
            List
          </span>
          <span className="hidden items-center gap-1 rounded-md px-2 py-1 text-[9px] font-semibold text-slate-400 sm:flex">
            <Heart className="h-2.5 w-2.5" strokeWidth={2.5} />
            Favourites
          </span>
        </div>
        <span className="hidden items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[9px] text-slate-500 md:flex">
          <Search className="h-2.5 w-2.5" strokeWidth={2.5} />
          Search guest
        </span>
      </div>

      {/* photo grid — also the positioning context for the live activity toast */}
      <div className="relative grid grid-cols-3 gap-1.5 px-4 pb-4 sm:grid-cols-4 sm:px-5 sm:pb-5">
        {Array.from({ length: TILE_COUNT }, (_, index) => {
          const isNew = index >= newFrom;
          return (
            <PhotoTile
              key={isNew ? `${cycle}-${index}` : index}
              seed={index + 1}
              className={clsx(
                "aspect-square w-full",
                isNew && addedThisCycle > 0 && "animate-pop-in shadow-glow ring-2 ring-indigo-500/70"
              )}
              rounded="rounded-lg"
            />
          );
        })}

        {addedThisCycle > 0 && (
          <div
            key={`${cycle}-toast-${addedThisCycle}`}
            className="absolute right-6 top-2 z-20 flex animate-slide-in-right items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-2.5 py-2 shadow-xl backdrop-blur-md"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
              <ImagePlus className="h-3 w-3" strokeWidth={2.8} />
            </span>
            <span>
              <span className="block text-[9px] font-bold text-white">
                +{addedThisCycle} photo{addedThisCycle === 1 ? "" : "s"} just added
              </span>
              <span className="block text-[8px] text-slate-500">Guest device · seconds ago</span>
            </span>
          </div>
        )}
      </div>

      {/* host control bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-800 bg-slate-950/40 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 shrink-0 text-indigo-400" strokeWidth={2.5} />
          <div className="flex rounded-md border border-slate-700 bg-slate-950 p-[2px]">
            {["Private", "Shared", "Public"].map((mode, index) => (
              <span
                key={mode}
                className={clsx(
                  "rounded-[5px] px-1.5 py-[3px] text-[8px] font-bold",
                  index === 1 ? "bg-slate-700 text-white" : "text-slate-500"
                )}
              >
                {mode}
              </span>
            ))}
          </div>
          <span className="hidden text-[8px] font-medium text-slate-500 lg:inline">
            Expires in 30 days
          </span>
        </div>

        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[9px] font-bold transition",
            unlocked
              ? "brand-gradient text-white shadow-lg shadow-indigo-500/25"
              : "border border-slate-700 bg-slate-950 text-slate-300"
          )}
        >
          {unlocked ? (
            <>
              <Download className="h-3 w-3" strokeWidth={2.8} />
              Originals ZIP · 42.6 MB
            </>
          ) : (
            <>
              <FileArchive className="h-3 w-3" strokeWidth={2.5} />
              Unlock originals · R50
            </>
          )}
        </span>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-300">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-extrabold leading-none tracking-tight text-white tabular-nums">
          {value}
        </span>
        <span className="mt-0.5 block truncate text-[8px] font-medium uppercase tracking-[0.08em] text-slate-500">
          {label}
        </span>
      </span>
    </div>
  );
}

export default DesktopMockup;
