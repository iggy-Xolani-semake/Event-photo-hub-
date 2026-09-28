"use client";

import clsx from "clsx";
import { Pause, Play, RotateCcw, ScanLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGuestDemoRequest } from "./demoStore";
import { DesktopMockup } from "./mockup/DesktopMockup";
import { PhoneMockup, type DemoPhase } from "./mockup/PhoneMockup";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const PHASES: DemoPhase[] = ["scan", "pick", "upload", "done"];

const PHASE_DWELL: Record<DemoPhase, number> = {
  scan: 3200,
  pick: 3600,
  upload: 2800,
  done: 4200,
};

const PHASE_CAPTION: Record<DemoPhase, string> = {
  scan: "Guest points their camera at the printed QR poster",
  pick: "Picks photos straight from the camera roll — no sign-up",
  upload: "Uploads go direct to Cloudflare R2 as WebP previews",
  done: "The host gallery fills up live, originals ready to unlock",
};

const BASE_PHOTOS = 21;
const BASE_GUESTS = 8;
const UPLOAD_DURATION_MS = 2400;
const PHOTOS_PER_CYCLE = 3;

/**
 * The hero's dual mockup: the guest's phone next to the host's gallery, playing
 * the whole loop end to end.
 *
 * It is an animation of the real flow rather than a static screenshot, because
 * "no app, no sign-up, gallery updates live" is the entire pitch — a still
 * image cannot show it. Autoplays on load, pauses for reduced-motion visitors
 * (who get the finished state instead), and can be driven by hand from the
 * control bar or the "Try Guest Demo" button in the hero.
 */
export function HeroShowcase() {
  const reducedMotion = usePrefersReducedMotion();
  const demoRequests = useGuestDemoRequest();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  /** Changes on every transition; used as a React key so pop-ins replay. */
  const [tick, setTick] = useState(0);

  const phase = PHASES[phaseIndex] ?? "scan";

  const advance = useCallback(() => {
    setPhaseIndex((current) => (current + 1) % PHASES.length);
    setTick((current) => current + 1);
  }, []);

  const restart = useCallback(() => {
    setPhaseIndex(0);
    setProgress(0);
    setTick((current) => current + 1);
    setPlaying(true);
  }, []);

  const jumpTo = useCallback((index: number) => {
    setPhaseIndex(index);
    setTick((current) => current + 1);
    setPlaying(false);
  }, []);

  // Reduced motion: skip the loop and show the payoff state instead.
  useEffect(() => {
    if (!reducedMotion) return;
    setPlaying(false);
    setPhaseIndex(3);
    setProgress(100);
  }, [reducedMotion]);

  // Autoplay scheduler. Re-armed on every phase change; cleared on unmount or
  // whenever the visitor pauses, so no timers survive the transition.
  useEffect(() => {
    if (!playing || reducedMotion) return;
    const timer = setTimeout(advance, PHASE_DWELL[phase]);
    return () => clearTimeout(timer);
  }, [phase, playing, reducedMotion, advance]);

  // Upload progress, time-based so it stays correct even if the tab throttles
  // the interval in the background.
  useEffect(() => {
    if (phase !== "upload") return;
    if (reducedMotion) {
      setProgress(100);
      return;
    }

    setProgress(0);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.min(100, (elapsed / UPLOAD_DURATION_MS) * 100);
      setProgress(next);
      if (next >= 100) clearInterval(interval);
    }, 60);

    return () => clearInterval(interval);
  }, [phase, reducedMotion]);

  // "Try Guest Demo" in the hero: scroll here and start from the top. Reduced
  // motion visitors get the finished state rather than a restarted loop.
  useEffect(() => {
    if (demoRequests === 0) return;

    if (reducedMotion) {
      setPlaying(false);
      setPhaseIndex(PHASES.length - 1);
      setProgress(100);
    } else {
      restart();
    }

    rootRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center",
    });
  }, [demoRequests, restart, reducedMotion]);

  // One source of truth for "how many photos have landed": the phone's upload
  // rows and the desktop gallery both read this, so the two devices always
  // agree on the count.
  const added =
    phase === "done"
      ? PHOTOS_PER_CYCLE
      : phase === "upload"
        ? Math.min(PHOTOS_PER_CYCLE, Math.floor(progress / (100 / PHOTOS_PER_CYCLE)))
        : 0;

  return (
    <div ref={rootRef} className="relative">
      {/* ambient colour behind the devices */}
      <div
        className="pointer-events-none absolute -inset-x-10 -inset-y-16 -z-10 opacity-70 blur-3xl dark:opacity-50"
        aria-hidden="true"
      >
        <div className="absolute left-[8%] top-[12%] h-52 w-52 rounded-full bg-indigo-400/30 dark:bg-indigo-600/25" />
        <div className="absolute right-[6%] top-[4%] h-64 w-64 rounded-full bg-violet-400/25 dark:bg-violet-600/25" />
        <div className="absolute bottom-[6%] right-[24%] h-48 w-48 rounded-full bg-fuchsia-300/25 dark:bg-fuchsia-600/20" />
      </div>

      <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-center lg:gap-10 xl:gap-16">
        {/* The phone sits beside the gallery rather than overlapping it: hiding
            part of either device to create depth would cost the visitor the
            exact UI they came to see. The slight tilt + float keep the pair
            from reading as a static diagram. */}
        <div className={clsx("relative z-20", !reducedMotion && "lg:-rotate-2")}>
          <div className={clsx(!reducedMotion && "lg:animate-float-slow")}>
            <PhoneMockup
              phase={phase}
              progress={progress}
              completed={added}
              onAdvance={() => {
                setPlaying(false);
                advance();
              }}
            />
          </div>
        </div>

        <div className="relative z-10 w-full max-w-[640px]">
          <DesktopMockup
            photos={BASE_PHOTOS + added}
            guests={BASE_GUESTS + (added > 0 ? 1 : 0)}
            addedThisCycle={added}
            cycle={tick}
            unlocked={phase === "done"}
          />
        </div>
      </div>

      <DemoControls
        phase={phase}
        phaseIndex={phaseIndex}
        playing={playing}
        reducedMotion={reducedMotion}
        onTogglePlay={() => setPlaying((current) => !current)}
        onRestart={restart}
        onJumpTo={jumpTo}
      />
    </div>
  );
}

interface DemoControlsProps {
  phase: DemoPhase;
  phaseIndex: number;
  playing: boolean;
  reducedMotion: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onJumpTo: (index: number) => void;
}

/**
 * The accessible face of the demo. The phone mockup itself is aria-hidden
 * decoration with tabindex -1 buttons, so everything it can do is duplicated
 * here as real, focusable, labelled controls.
 */
function DemoControls({
  phase,
  phaseIndex,
  playing,
  reducedMotion,
  onTogglePlay,
  onRestart,
  onJumpTo,
}: DemoControlsProps) {
  return (
    <div className="mt-10 flex flex-col items-center gap-3 lg:mt-12">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={reducedMotion}
            aria-label={playing ? "Pause the guest demo" : "Play the guest demo"}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onRestart}
            aria-label="Restart the guest demo"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          {PHASES.map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => onJumpTo(index)}
              aria-label={`Show demo step ${index + 1}: ${PHASE_CAPTION[step]}`}
              aria-current={index === phaseIndex ? "step" : undefined}
              className={clsx(
                "h-2 rounded-full transition-all duration-300",
                index === phaseIndex
                  ? "w-6 bg-gradient-to-r from-indigo-500 to-violet-500"
                  : "w-2 bg-slate-300 hover:bg-slate-400 dark:bg-white/20 dark:hover:bg-white/40"
              )}
            />
          ))}
        </div>
      </div>

      <p
        className="flex max-w-md items-start justify-center gap-1.5 text-center text-xs text-slate-500 dark:text-white/45"
        aria-live="polite"
      >
        <ScanLine className="mt-[1px] h-3.5 w-3.5 shrink-0 text-violet-500" strokeWidth={2.5} />
        <span>
          <span className="font-semibold text-slate-700 dark:text-white/70">
            Step {phaseIndex + 1} of {PHASES.length}.
          </span>{" "}
          {PHASE_CAPTION[phase]}
        </span>
      </p>
    </div>
  );
}

export default HeroShowcase;
