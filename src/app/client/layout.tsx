import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/admin/SignOutButton";

// A deliberately different shell from /admin's layout — no "+ Create
// Event", no cross-event platform stats, no admin-only nav. This is the
// view a client (couple, DJ, corporate planner) should land on: their
// events, their photos, nothing that implies they're managing the whole
// platform. RLS still does the actual data scoping either way — this
// route exists for clarity of experience, not as a security boundary.
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/client" className="font-display text-lg">
          Your Events
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40 hidden sm:block">{user?.email}</span>
          <SignOutButton />
        </div>
      </header>
      <div>{children}</div>
    </div>
  );
}
