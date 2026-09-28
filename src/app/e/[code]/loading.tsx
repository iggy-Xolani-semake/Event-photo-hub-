import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Guest event loading state — mirrors the GuestShell shape (minimal header,
 * centred content column, fixed bottom action bar) so the transition to the
 * real screen doesn't jump.
 */
export default function GuestEventLoading() {
  return (
    <div className="min-h-screen bg-canvas" aria-busy="true" aria-label="Loading event">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 py-3">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </header>

      <main className="px-4 pb-32 pt-8">
        <div className="mx-auto w-full max-w-md">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-6 aspect-[3/2] w-full rounded-2xl" />
          <Skeleton className="mt-6 h-5 w-56" />
          <div className="mt-8 space-y-3">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-2 shadow-xl backdrop-blur-md">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
