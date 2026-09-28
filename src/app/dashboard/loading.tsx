import { Skeleton, SkeletonCard, SkeletonGrid } from "@/components/ui/Skeleton";

/**
 * Route-level loading state: skeletons mirror the dashboard's real shape
 * (header, stat row, create form, event cards) so nothing jumps on hydration.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>

      <SkeletonCard lines={4} />

      <div className="space-y-4">
        <Skeleton className="h-7 w-32" />
        <SkeletonGrid count={3} lines={2} />
      </div>
    </div>
  );
}
