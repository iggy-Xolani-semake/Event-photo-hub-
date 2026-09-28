import Link from "next/link";
import { MemoraLogo } from "@/components/marketing/MemoraLogo";

const PRODUCT_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

const HOST_LINKS = [
  { href: "/signup", label: "Create an event" },
  { href: "/login", label: "Host login" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/privacy", label: "Privacy Policy" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-white/10 dark:bg-ink-950">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr] md:gap-8">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              <MemoraLogo size="sm" className="h-9 w-9" />
              <span className="text-lg font-extrabold tracking-[-0.045em] text-slate-900 dark:text-white">
                Memora
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-white/45">
              One QR code, every guest photo. Collect the unedited, full-resolution memories from
              your event without making anyone download an app.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200/80 dark:bg-white/[0.04] dark:text-white/40 dark:ring-white/10">
              Capture · Share · Relive
            </p>
          </div>

          <nav aria-label="Product">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-900 dark:text-white">
              Product
            </h2>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-500 transition hover:text-violet-600 dark:text-white/45 dark:hover:text-violet-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Hosts">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-900 dark:text-white">
              For hosts
            </h2>
            <ul className="mt-4 space-y-2.5">
              {HOST_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-500 transition hover:text-violet-600 dark:text-white/45 dark:hover:text-violet-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-5 border-t border-slate-200 pt-7 sm:flex-row dark:border-white/10">
          <p className="text-xs text-slate-400 dark:text-white/35">
            © {new Date().getFullYear()} Memora. All rights reserved.
          </p>

          <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link
              href="/terms"
              className="text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-white/45 dark:hover:text-white"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-white/45 dark:hover:text-white"
            >
              Privacy Policy
            </Link>
            <Link
              href="/login"
              className="text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-white/45 dark:hover:text-white"
            >
              Host Login
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
