import { Skeleton } from "@/components/ui/Feedback";

/**
 * The portfolio fetches live prices plus a price series per holding, so it is
 * the slowest page in the app and the one that most needs a skeleton.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your portfolio…</span>

      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-11 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[86px]" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-[380px] lg:col-span-3" />
        <Skeleton className="h-[380px] lg:col-span-2" />
      </div>

      <Skeleton className="h-64" />
    </div>
  );
}
