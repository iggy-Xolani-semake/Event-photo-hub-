import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider } from "@/components/ui/Toast";
import { SkipLink } from "@/components/ui/SkipLink";
import { requireUser } from "@/lib/auth/requireUser";

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
    <ToastProvider>
      <div className="min-h-screen bg-canvas">
        <SkipLink />
        <AppHeader />
        <DashboardShell>{children}</DashboardShell>
      </div>
    </ToastProvider>
  );
}
