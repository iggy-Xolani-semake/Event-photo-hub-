import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { SignOutButton } from "@/components/admin/SignOutButton";

/**
 * Client-facing area. Distinct from /admin on purpose: that is the internal
 * console for site-host staff, this is where a client manages the events they
 * own. Both are gated by a session; what differs is what the database lets
 * each of them see (events_select_authenticated) and which API routes they
 * are allowed to call.
 *
 * The redirect here is the real gate. Middleware also covers /dashboard, but
 * middleware is bypassable by hitting an API route directly, so the API
 * routes re-check with requireUser() independently.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-white/10 px-5 py-4 md:py-6 flex md:flex-col justify-between md:justify-start">
        <div>
          <Link href="/dashboard" className="font-display text-lg block mb-6">
            Memora
          </Link>
          <nav className="hidden md:flex flex-col gap-1 text-sm">
            <Link href="/dashboard" className="px-3 py-2 rounded-lg hover:bg-white/5 text-white/80">
              My events
            </Link>
            <Link
              href="/dashboard#new-event"
              className="px-3 py-2 rounded-lg hover:bg-white/5 text-white/80"
            >
              + New event
            </Link>
            <Link
              href="/privacy"
              target="_blank"
              className="px-3 py-2 rounded-lg hover:bg-white/5 text-white/40 text-xs mt-2"
            >
              Privacy Policy
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 md:mt-auto md:pt-6 md:border-t md:border-white/10">
          <span className="text-xs text-white/40 truncate hidden md:block">{user.email}</span>
          <SignOutButton />
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
