"use client";

import clsx from "clsx";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { MemoraLogo } from "@/components/marketing/MemoraLogo";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

/**
 * Sticky marketing header. Transparent over the hero and gains a blurred
 * surface + hairline border only once the page has scrolled, so the hero
 * artwork keeps its full bleed.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Stop the page scrolling behind the open mobile sheet.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-ink-950/85"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-ink-950"
          onClick={() => setMenuOpen(false)}
        >
          <MemoraLogo size="sm" className="h-8 w-8" />
          <span className="text-[1.15rem] font-extrabold tracking-[-0.045em] text-slate-900 dark:text-white">
            Memora
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 lg:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-900/[0.04] hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Link
            href="/login"
            className="hidden rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-900/[0.04] hover:text-slate-900 md:block dark:text-white/70 dark:hover:bg-white/[0.06] dark:hover:text-white"
          >
            Host login
          </Link>

          <Link
            href="/signup"
            className="brand-gradient hidden items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:shadow-glow-lg active:translate-y-0 sm:inline-flex"
          >
            Create event
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:text-slate-900 lg:hidden dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:text-white"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* mobile sheet */}
      <div
        id="mobile-nav"
        className={clsx(
          "overflow-hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-xl transition-[max-height,opacity,visibility] duration-300 lg:hidden dark:border-white/10 dark:bg-ink-950/95",
          // invisible when shut so the collapsed links leave the tab order
          menuOpen ? "visible max-h-96 opacity-100" : "invisible max-h-0 opacity-0"
        )}
      >
        <nav aria-label="Mobile" className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4 sm:px-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-3 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-900/[0.04] dark:text-white/70 dark:hover:bg-white/[0.06]"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 grid gap-2 border-t border-slate-200/80 pt-4 dark:border-white/10">
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className="brand-gradient flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-glow"
            >
              Create Your Event Free
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:text-white/75 dark:hover:bg-white/[0.06]"
            >
              Host login
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

export default SiteHeader;
