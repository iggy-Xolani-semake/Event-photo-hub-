import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the settings page shape: header, profile form card, side cards. */
export default function SettingsLoading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading account settings">
      <div className="space-y-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-3 w-48" />
          <div className="mt-6 space-y-4">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-6">
            <Skeleton className="h-5 w-24" />
            <div className="mt-5 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-6">
            <Skeleton className="h-5 w-20" />
            <div className="mt-5 flex gap-3">
              <Skeleton className="h-10 w-28 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
