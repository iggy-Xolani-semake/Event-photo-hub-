import { Skeleton } from "@/components/ui/Skeleton";

/** Client portal loading state: greeting, then the event rows. */
export default function ClientLoading() {
  return (
    <div className="mx-auto max-w-3xl p-6 md:p-10" aria-busy="true" aria-label="Loading your events">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-40" />

      <div className="mt-10 space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4"
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
