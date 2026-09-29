import { Skeleton } from "@/components/ui/Skeleton";

/** Admin event-detail loading state: header, share block, QR, settings form. */
export default function AdminEventLoading() {
  return (
    <div className="p-6 md:p-10" aria-busy="true" aria-label="Loading event">
      <Skeleton className="h-3.5 w-44" />
      <Skeleton className="mt-3 h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-56" />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {Array.from({ length: 2 }).map((_, card) => (
            <div key={card} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <Skeleton className="h-5 w-44" />
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-11 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <Skeleton className="mx-auto h-40 w-40 rounded-2xl" />
          <Skeleton className="mx-auto mt-4 h-4 w-32" />
        </div>
      </div>
    </div>
  );
}
