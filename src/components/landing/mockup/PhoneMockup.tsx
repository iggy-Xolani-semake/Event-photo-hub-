"use client";

import clsx from "clsx";
import {
  ArrowLeft,
  BatteryFull,
  Check,
  ChevronRight,
  ImagePlus,
  ScanLine,
  Signal,
  Upload,
  Wifi,
} from "lucide-react";
import { PhotoTile } from "./PhotoTile";
import { QrGlyph } from "./QrGlyph";

export type DemoPhase = "scan" | "pick" | "upload" | "done";

interface PhoneMockupProps {
  phase: DemoPhase;
  /** 0–100, only meaningful while phase === "upload". */
  progress: number;
  /**
   * How many of the three photos have finished uploading. Passed in from the
   * showcase rather than derived here, so the phone and the desktop gallery
   * can never disagree about how many photos have landed.
   */
  completed: number;
  /** Advances the demo one step; wired to the on-screen action button. */
  onAdvance: () => void;
}

const SELECTED_TILES = 3;

/**
 * The guest side of Memora: a phone held up to a printed QR poster, then the
 * whole upload flow, rendered in the app's own dark surface language so what
 * is advertised here is what the product looks like.
 *
 * The chrome is decorative, so the whole device is aria-hidden and its buttons
 * are tabindex -1; the accessible equivalents live in the demo control bar.
 */
export function PhoneMockup({ phase, progress, completed, onAdvance }: PhoneMockupProps) {
  return (
    <div className="relative w-[236px] shrink-0 sm:w-[258px]" aria-hidden="true">
      <div className="absolute -inset-8 rounded-[3.5rem] bg-indigo-600/20 blur-2xl" />

      <div className="relative rounded-[2.3rem] border border-slate-700 bg-slate-950 p-[9px] shadow-device">
        <span className="absolute -left-[3px] top-[92px] h-8 w-[3px] rounded-l-sm bg-slate-700" />
        <span className="absolute -left-[3px] top-[132px] h-12 w-[3px] rounded-l-sm bg-slate-700" />
        <span className="absolute -right-[3px] top-[112px] h-16 w-[3px] rounded-r-sm bg-slate-700" />

        <div className="relative h-[468px] overflow-hidden rounded-[1.85rem] bg-slate-900">
          <div className="absolute left-1/2 top-[7px] z-30 h-[18px] w-[74px] -translate-x-1/2 rounded-full bg-slate-950" />

          <div className="relative z-20 flex h-[30px] items-center justify-between px-5 pt-[6px] text-[10px] font-semibold text-white">
            <span className="tracking-tight">9:41</span>
            <span className="flex items-center gap-1">
              <Signal className="h-[11px] w-[11px]" strokeWidth={2.5} />
              <Wifi className="h-[11px] w-[11px]" strokeWidth={2.5} />
              <BatteryFull className="h-[13px] w-[13px]" strokeWidth={2.2} />
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 top-[30px]">
            {phase === "scan" && <ScanPhase onAdvance={onAdvance} />}
            {phase === "pick" && <PickPhase onAdvance={onAdvance} />}
            {phase === "upload" && <UploadPhase progress={progress} completed={completed} />}
            {phase === "done" && <DonePhase onAdvance={onAdvance} />}
          </div>

          <span className="absolute bottom-[6px] left-1/2 z-30 h-[3px] w-[92px] -translate-x-1/2 rounded-full bg-white/25" />
        </div>
      </div>
    </div>
  );
}

/** Phase 1 — the camera viewfinder locked onto the venue's QR poster. */
function ScanPhase({ onAdvance }: { onAdvance: () => void }) {
  return (
    <div className="relative flex h-full flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950">
      <div className="px-4 pt-3 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Camera</p>
      </div>

      {/* the printed poster sitting in the viewfinder — paper stays paper */}
      <div className="relative mx-5 mt-3 flex-1 overflow-hidden rounded-2xl bg-white p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <div className="h-[104px] w-[104px] text-slate-900">
            <QrGlyph />
          </div>
          <p className="text-[10px] font-black tracking-tight text-slate-900">
            Amara &amp; Thabo&apos;s Wedding
          </p>
          <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Scan to add your photos
          </p>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
          <div className="absolute inset-x-2 h-[2px] animate-scan rounded-full bg-indigo-500 shadow-[0_0_14px_3px_rgba(99,102,241,0.85)]" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-4 top-[52px] bottom-[92px]">
        {[
          "left-0 top-0 border-l-2 border-t-2 rounded-tl-lg",
          "right-0 top-0 border-r-2 border-t-2 rounded-tr-lg",
          "left-0 bottom-0 border-b-2 border-l-2 rounded-bl-lg",
          "right-0 bottom-0 border-b-2 border-r-2 rounded-br-lg",
        ].map((position) => (
          <span key={position} className={clsx("absolute h-5 w-5 border-white/80", position)} />
        ))}
      </div>

      <div className="px-4 pb-6 pt-4">
        <p className="mb-3 text-center text-[10px] font-medium leading-relaxed text-slate-400">
          memora.app detected · no app install needed
        </p>
        <PhoneButton onClick={onAdvance} icon={<ScanLine className="h-3.5 w-3.5" />}>
          Open upload page
        </PhoneButton>
      </div>
    </div>
  );
}

/** Phase 2 — choosing photos straight from the camera roll. No account. */
function PickPhase({ onAdvance }: { onAdvance: () => void }) {
  return (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="flex items-center gap-2 px-4 pt-3">
        <ArrowLeft className="h-3.5 w-3.5 text-slate-500" strokeWidth={2.5} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold tracking-tight text-white">
            Amara &amp; Thabo&apos;s Wedding
          </p>
          <p className="text-[9px] text-slate-500">Shared gallery · code AMR8THBQ</p>
        </div>
      </div>

      <div className="px-4 pb-2 pt-3">
        <p className="text-[13px] font-extrabold tracking-tight text-white">Add your photos</p>
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-[3px] text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-400 ring-1 ring-emerald-500/30">
          <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
          No sign-up required
        </span>
      </div>

      <div className="grid flex-1 grid-cols-3 content-start gap-[5px] px-4">
        {Array.from({ length: 9 }, (_, index) => {
          const selected = index < SELECTED_TILES;
          return (
            <div
              key={index}
              className={clsx(
                "relative aspect-square overflow-hidden rounded-md ring-2 ring-offset-1 ring-offset-slate-900 transition",
                selected ? "ring-indigo-500" : "ring-transparent"
              )}
            >
              <PhotoTile seed={index + 2} className="h-full w-full" rounded="rounded-md" />
              {selected && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                  <Check className="h-2.5 w-2.5" strokeWidth={4} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-800 px-4 pb-6 pt-3">
        <p className="mb-2 text-[9px] text-slate-500">
          {SELECTED_TILES} selected · originals kept, WebP preview generated
        </p>
        <PhoneButton onClick={onAdvance} icon={<ImagePlus className="h-3.5 w-3.5" />}>
          Upload {SELECTED_TILES} photos
        </PhoneButton>
      </div>
    </div>
  );
}

/** Phase 3 — the upload itself: signed direct-to-R2, with live progress. */
function UploadPhase({ progress, completed }: { progress: number; completed: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const perFile = 100 / SELECTED_TILES;

  return (
    <div className="flex h-full flex-col bg-slate-900 px-4">
      <div className="pt-6">
        <p className="text-[13px] font-extrabold tracking-tight text-white">Uploading your photos</p>
        <p className="mt-1 text-[9px] text-slate-500">
          Direct to Cloudflare R2 · nothing passes through our servers
        </p>
      </div>

      <div className="mt-5 space-y-2.5">
        {Array.from({ length: SELECTED_TILES }, (_, index) => {
          const complete = index < completed;
          const active = index === completed && clamped < 100;
          const tileProgress = complete
            ? 100
            : active
              ? Math.max(0, Math.min(100, (clamped - index * perFile) * (100 / perFile)))
              : 0;

          return (
            <div
              key={index}
              className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-800/40 p-2"
            >
              <PhotoTile seed={index + 2} className="h-9 w-9 shrink-0" rounded="rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[9px] font-semibold text-slate-300">
                    IMG_{2041 + index}.HEIC
                  </p>
                  <span className="text-[8px] font-bold tabular-nums text-slate-500">
                    {complete ? "100%" : `${Math.round(tileProgress)}%`}
                  </span>
                </div>
                <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-[width] duration-150 ease-out"
                    style={{ width: `${complete ? 100 : tileProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-[8px] text-slate-500">
                  {complete ? "Preview ready · original stored" : "Compressing WebP preview…"}
                </p>
              </div>
              {complete && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto pb-6">
        <div className="mb-2 flex items-center justify-between text-[9px] font-semibold text-slate-500">
          <span>{clamped}% complete</span>
          <span className="tabular-nums">1.4s left</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-500 transition-[width] duration-150 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/** Phase 4 — confirmation, with the gallery now live for the host. */
function DonePhase({ onAdvance }: { onAdvance: () => void }) {
  return (
    <div className="flex h-full flex-col items-center bg-slate-900 px-5 text-center">
      <div className="brand-gradient mt-10 flex h-16 w-16 animate-pop-in items-center justify-center rounded-full text-white shadow-lg shadow-indigo-500/30">
        <Check className="h-8 w-8" strokeWidth={3} />
      </div>

      <p className="mt-5 text-[15px] font-extrabold tracking-tight text-white">Photos shared!</p>
      <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
        {SELECTED_TILES} photos added to Amara &amp; Thabo&apos;s Wedding. The host gallery just
        updated live.
      </p>

      <div className="mt-5 grid w-full grid-cols-3 gap-1.5">
        {Array.from({ length: SELECTED_TILES }, (_, index) => (
          <PhotoTile
            key={index}
            seed={index + 2}
            className="aspect-square w-full animate-pop-in"
            rounded="rounded-lg"
            style={{ animationDelay: `${index * 90}ms` }}
          />
        ))}
      </div>

      <div className="mt-5 w-full rounded-xl border border-slate-800 bg-slate-800/40 p-2.5 text-left">
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
          Uploads stay open
        </p>
        <p className="mt-0.5 text-[10px] font-semibold text-slate-300">
          6 days 23 hours left · gallery visible for 30 days
        </p>
      </div>

      <div className="mt-auto w-full space-y-2 pb-6">
        <PhoneButton onClick={onAdvance} icon={<Upload className="h-3.5 w-3.5" />}>
          Add more photos
        </PhoneButton>
        <button
          type="button"
          tabIndex={-1}
          onClick={onAdvance}
          className="flex w-full items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold text-slate-400 transition hover:text-white"
        >
          View the gallery
          <ChevronRight className="h-3 w-3" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

function PhoneButton({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      className="brand-gradient flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[10px] font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 active:scale-[0.98]"
    >
      {icon}
      {children}
    </button>
  );
}

export default PhoneMockup;
