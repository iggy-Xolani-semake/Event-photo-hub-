import Link from "next/link";
import { MemoraMark } from "@/components/marketing/MemoraMark";

const PRODUCT_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

const ACCESS_LINKS = [
  { href: "/signup", label: "Create an event" },
  { href: "/login", label: "Host Sign-in" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
] as const;

/**
 * Global footer: minimalist three-column dark layout (brand, product, access
 * & legal) with the copyright line beneath. Shared by marketing, public
 * gallery and legal pages — app surfaces (dashboard, guest upload) stay
 * chrome-free on purpose.
 */
export function AppFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <MemoraMark size={36} className="drop-shadow-[0_6px_16px_rgba(99,102,241,0.35)]" />
              <span className="text-lg font-bold tracking-tight text-white">Memora</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              One QR code, every guest photo. Collect the unedited, full-resolution memories from
              your event — no apps, no guest accounts.
            </p>
          </div>

          <nav aria-label="Product">
            <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Product</h2>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Access and legal">
            <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Access &amp; legal
            </h2>
            <ul className="mt-4 space-y-2.5">
              {ACCESS_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-7 sm:flex-row">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Memora. All rights reserved.
          </p>
          <p className="text-xs text-slate-600">Capture · Share · Relive</p>
        </div>
      </div>
    </footer>
  );
}

export default AppFooter;
