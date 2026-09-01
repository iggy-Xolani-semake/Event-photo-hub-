import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/admin/SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-white/10 px-5 py-4 md:py-6 flex md:flex-col justify-between md:justify-start">
        <div>
          <Link href="/admin" className="font-display text-lg block mb-6">
            Event Photo Hub
          </Link>
          <nav className="hidden md:flex flex-col gap-1 text-sm">
            <Link href="/admin" className="px-3 py-2 rounded-lg hover:bg-white/5 text-white/80">
              Dashboard
            </Link>
            <Link href="/admin/events/new" className="px-3 py-2 rounded-lg hover:bg-white/5 text-white/80">
              + Create Event
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
          <span className="text-xs text-white/40 truncate hidden md:block">{user?.email}</span>
          <SignOutButton />
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
