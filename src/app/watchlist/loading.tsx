import { Skeleton } from "@/components/ui/Feedback";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your watchlist…</span>

      <div className="space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-56" />
      </div>

      <Skeleton className="h-96" />
    </div>
  );
}
