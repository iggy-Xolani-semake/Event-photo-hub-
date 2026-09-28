"use client";

import clsx from "clsx";
import { CreditCard, LayoutGrid, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Events", icon: LayoutGrid, exact: true },
  { href: "/dashboard/billing", label: "Billing & Packages", icon: CreditCard, exact: false },
  { href: "/dashboard/settings", label: "Account Settings", icon: Settings, exact: false },
] as const;

/**
 * Host dashboard shell: sticky sidebar on desktop, horizontal top bar on
 * mobile, identical link set in both. Active state is derived from the path
 * so /dashboard/events/[code] keeps "Events" lit.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  const linkClass = (href: string, exact: boolean) =>
    clsx(
      "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
      isActive(href, exact)
        ? "bg-slate-800/80 text-white shadow-inner ring-1 ring-slate-700"
        : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
    );

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <aside className="hidden w-60 shrink-0 lg:block">
        <nav aria-label="Dashboard" className="sticky top-24 space-y-1.5">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href, item.exact)}>
              <item.icon className="h-4 w-4" strokeWidth={2.2} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* mobile / tablet sticky top bar (the fixed bottom bar is reserved for
          the guest experience, per the layout spec) */}
      <nav
        aria-label="Dashboard"
        className="no-scrollbar sticky top-16 z-40 -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-slate-800 bg-slate-900/80 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:z-auto lg:hidden lg:overflow-visible lg:border-0 lg:bg-transparent lg:backdrop-blur-none"
      >
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href, item.exact)}>
            <item.icon className="h-4 w-4" strokeWidth={2.2} />
            <span className="lg:hidden">{item.label.split(" ")[0]}</span>
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
        ))}
      </nav>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

export default DashboardShell;
