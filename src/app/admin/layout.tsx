import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { SkipLink } from "@/components/ui/SkipLink";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-canvas text-white">
      <SkipLink />
      <aside className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-slate-800 px-5 py-4 md:py-6 flex md:flex-col justify-between md:justify-start">
        <div>
          <Link href="/admin" className="mb-6 block bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            shutaMzala
          </Link>
          <nav className="hidden md:flex flex-col gap-1 text-sm">
            <Link href="/admin" className="px-3 py-2 rounded-lg hover:bg-slate-800/40 text-slate-300">
              Dashboard
            </Link>
            <Link href="/admin/events/new" className="px-3 py-2 rounded-lg hover:bg-slate-800/40 text-slate-300">
              + Create Event
            </Link>
            <Link
              href="/privacy"
              target="_blank"
              className="px-3 py-2 rounded-lg hover:bg-slate-800/40 text-slate-500 text-xs mt-2"
            >
              Privacy Policy
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 md:mt-auto md:pt-6 md:border-t md:border-slate-800">
          <span className="text-xs text-slate-500 truncate hidden md:block">{user?.email}</span>
          <SignOutButton />
        </div>
      </aside>
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">{children}</main>
    </div>
  );
}
