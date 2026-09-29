"use client";

import clsx from "clsx";
import {
  Bell,
  Camera,
  ChevronDown,
  Images,
  LayoutGrid,
  Menu,
  Search,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { parseEventCodeOrLink } from "@/lib/eventCode";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { GlobalSearch } from "./GlobalSearch";
import { ScrollProgressBar } from "./ScrollProgressBar";

export interface HeaderUser {
  email: string;
  name: string | null;
}

export interface HeaderEvent {
  event_code: string;
  event_name: string;
  photo_count: number;
  download_unlocked_at: string | null;
  status: string;
}

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

/**
 * Client half of the global header: everything interactive (find-event
 * popover, switcher and profile dropdowns, mobile sheet) lives here while the
 * session-aware data is fetched by the server parent.
 */
export function HeaderBar({ user, events }: { user: HeaderUser | null; events: HeaderEvent[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Galleries with photos but no paid unlock yet — the one thing a host
  // actually needs nudged about, so it earns the notification indicator.
  const pendingUnlocks = events.filter(
    (event) => event.photo_count > 0 && !event.download_unlocked_at && event.status === "active"
  ).length;

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md">
      {/* Reading progress for the long marketing scroll; sits above the header
          so it reads as part of the page, not the bar. */}
      <ScrollProgressBar />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl shadow-lg shadow-indigo-500/25">
            <Camera className="h-5 w-5 text-white" strokeWidth={2.4} />
          </span>
          <span className="text-lg font-bold tracking-tight text-white">Memora</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Host search: only useful to someone who owns events, and only
                  they can call the API behind it. */}
              <div className="hidden sm:block">
                <GlobalSearch />
              </div>

              <div className="hidden md:block">
                <EventSwitcher events={events} />
              </div>

              <Link
                href="/dashboard"
                aria-label={
                  pendingUnlocks > 0
                    ? `${pendingUnlocks} galler${pendingUnlocks === 1 ? "y" : "ies"} awaiting download unlock`
                    : "Notifications"
                }
                className="relative inline-flex aspect-square items-center justify-center rounded-lg bg-slate-800/50 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              >
                <Bell className="h-4 w-4" strokeWidth={2.2} />
                {pendingUnlocks > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-950">
                    {pendingUnlocks}
                  </span>
                )}
              </Link>

              <div className="hidden md:block">
                <ProfileMenu user={user} />
              </div>
            </>
          ) : (
            <>
              <div className="hidden sm:block">
                <FindEventControl />
              </div>
              <ButtonLink href="/login" variant="secondary" size="sm" className="hidden sm:inline-flex">
                Sign In
              </ButtonLink>
              <ButtonLink href="/signup" size="sm" className="hidden sm:inline-flex">
                Create Event
              </ButtonLink>
            </>
          )}

          <IconButton
            label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
            className="lg:hidden"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </IconButton>
        </div>
      </div>

      {/* mobile sheet */}
      <div
        className={clsx(
          "overflow-hidden border-slate-800 bg-slate-900/95 backdrop-blur-md transition-[max-height,opacity,visibility] duration-300 lg:hidden",
          menuOpen ? "visible max-h-[480px] border-t opacity-100" : "invisible max-h-0 opacity-0"
        )}
      >
        <div className="space-y-4 px-4 py-5 sm:px-6">
          <nav aria-label="Mobile" className="grid gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/60 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {user ? (
            <div className="space-y-3 border-t border-slate-800 pt-4">
              <GlobalSearch fullWidth />
              <EventSwitcher events={events} />
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
                <Avatar user={user} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{user.name ?? "Host"}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ButtonLink href="/dashboard" variant="secondary" size="sm">
                  Dashboard
                </ButtonLink>
                <ButtonLink href="/dashboard/settings" variant="secondary" size="sm">
                  Settings
                </ButtonLink>
              </div>
              <SignOutButton compact />
            </div>
          ) : (
            <div className="space-y-3 border-t border-slate-800 pt-4">
              <FindEventControl fullWidth />
              <div className="grid grid-cols-2 gap-2">
                <ButtonLink href="/login" variant="secondary" size="sm">
                  Sign In
                </ButtonLink>
                <ButtonLink href="/signup" size="sm">
                  Create Event
                </ButtonLink>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */

function Dropdown({
  label,
  children,
  button,
  align = "right",
}: {
  label: string;
  children: ReactNode;
  button: ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {button}
      </button>
      {open && (
        <div
          className={clsx(
            "absolute top-full z-50 mt-2 w-64 animate-fade-in overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-xl backdrop-blur-md",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function Avatar({ user }: { user: HeaderUser }) {
  const initials = (user.name ?? user.email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span className="brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg shadow-indigo-500/25">
      {initials || "M"}
    </span>
  );
}

/** Quick switcher between the host's recent events. */
function EventSwitcher({ events }: { events: HeaderEvent[] }) {
  const pathname = usePathname();
  const currentCode = pathname.match(/^\/dashboard\/events\/([^/]+)/)?.[1]?.toUpperCase();
  const current = events.find((event) => event.event_code === currentCode);

  return (
    <Dropdown
      label="Switch event"
      align="right"
      button={
        <>
          <Images className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2.2} />
          <span className="max-w-[140px] truncate text-left">
            {current ? current.event_name : "Your events"}
          </span>
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={2.4} />
        </>
      }
    >
      <div className="max-h-72 overflow-y-auto p-1.5">
        {events.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-slate-500">No events yet.</p>
        ) : (
          events.map((event) => (
            <Link
              key={event.event_code}
              href={`/dashboard/events/${event.event_code}`}
              className={clsx(
                "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-800/70",
                event.event_code === currentCode ? "text-white" : "text-slate-300"
              )}
            >
              <span className="truncate">{event.event_name}</span>
              <span className="shrink-0 text-xs tabular-nums text-slate-500">{event.photo_count}</span>
            </Link>
          ))
        )}
      </div>
      <div className="border-t border-slate-800 p-1.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-white"
        >
          <LayoutGrid className="h-4 w-4" strokeWidth={2.2} />
          All events
        </Link>
      </div>
    </Dropdown>
  );
}

function ProfileMenu({ user }: { user: HeaderUser }) {
  return (
    <Dropdown
      label="Account menu"
      align="right"
      button={
        <>
          <Avatar user={user} />
          <span className="max-w-[120px] truncate">{user.name ?? user.email}</span>
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={2.4} />
        </>
      }
    >
      <div className="border-b border-slate-800 px-4 py-3">
        <p className="truncate text-sm font-semibold text-white">{user.name ?? "Host"}</p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>
      <div className="p-1.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-white"
        >
          <LayoutGrid className="h-4 w-4" strokeWidth={2.2} />
          Events
        </Link>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-white"
        >
          <Settings className="h-4 w-4" strokeWidth={2.2} />
          Account settings
        </Link>
        <div className="mt-1 border-t border-slate-800 pt-1">
          <SignOutButton compact />
        </div>
      </div>
    </Dropdown>
  );
}

/** "Find Event": paste a link or type a code, land on the guest experience. */
function FindEventControl({ fullWidth = false }: { fullWidth?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const code = parseEventCodeOrLink(value);
    if (!code) {
      setError("Enter a valid event code or link.");
      return;
    }
    router.push(`/e/${code}`);
  }

  return (
    <div ref={ref} className={clsx("relative", fullWidth && "w-full")}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={clsx(fullWidth && "w-full justify-start")}
      >
        <Search className="h-4 w-4" strokeWidth={2.2} />
        Find Event
      </Button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className={clsx(
            "absolute right-0 top-full z-50 mt-2 w-72 animate-fade-in rounded-2xl border border-slate-800 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md",
            fullWidth && "static mt-0 w-full"
          )}
        >
          <label
            htmlFor="find-event-input"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500"
          >
            Event code or link
          </label>
          <div className="flex gap-2">
            <input
              id="find-event-input"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
              placeholder="AMR8THBQ"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Button type="submit" size="sm">
              Open
            </Button>
          </div>
          {error && <p role="alert" className="mt-2 text-xs font-medium text-rose-400">{error}</p>}
        </form>
      )}
    </div>
  );
}
