import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Guest gallery loading state.
 *
 * This is the one skeleton a guest is most likely to see: the gallery is
 * dynamic, it presigns a URL per photo, and it is opened from a QR code on
 * venue wifi. The shape mirrors the real screen — sticky header bar, event
 * title, toolbar, then the photo grid — so the grid does not jump when the
 * thumbnails arrive.
 */
export default function GalleryLoading() {
  return (
    <div className="min-h-screen pb-24" aria-busy="true" aria-label="Loading gallery">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-5">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
