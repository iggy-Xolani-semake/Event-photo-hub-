"use client";

import { useEffect, useRef } from "react";

/**
 * Reading-progress line pinned to the very top of the viewport.
 *
 * The landing page is a long scroll and the header is sticky, so without this
 * there is nothing telling a visitor how much of the pitch is left. It sits
 * above the header (`z-[60]` vs the header's `z-50`) and is `pointer-events-none`
 * so it can never swallow a click on the nav.
 *
 * Decorative: `aria-hidden`, no `role="progressbar"`, because a screen reader
 * announcing a scroll percentage on every frame would be noise, not navigation.
 * The width is written straight to the DOM node inside a rAF callback rather
 * than through React state — a scroll listener that re-renders the tree on
 * every frame is how a smooth page starts feeling sticky.
 */
export function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let frame = 0;

    function update() {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      // Short pages (an auth form, the 404) have nothing to progress through.
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      bar!.style.transform = `scaleX(${progress})`;
      bar!.style.opacity = progress > 0.002 ? "1" : "0";
    }

    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 print:hidden"
      aria-hidden="true"
    >
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-400 opacity-0 transition-opacity duration-300"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}

export default ScrollProgressBar;
