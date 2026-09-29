import { Skeleton } from "@/components/ui/Skeleton";

/** New-event form loading state: field labels, inputs and the submit button. */
export default function NewEventLoading() {
  return (
    <div className="mx-auto max-w-2xl p-6 md:p-10" aria-busy="true" aria-label="Loading the new event form">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mt-8 space-y-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
        <Skeleton className="h-11 w-40 rounded-xl" />
      </div>
    </div>
  );
}
