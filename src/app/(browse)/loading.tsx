import { Skeleton } from "@/components/ui/Feedback";

/**
 * Skeleton for the market page while it streams in.
 *
 * This lives in the `(browse)` route group rather than at the app root on
 * purpose. A `loading.tsx` opens a Suspense boundary, which makes Next flush
 * response headers before the page body resolves — a later `notFound()` then
 * renders the 404 page with a 200 status. Keeping the boundary off
 * `/coins/[id]` lets an unknown coin id return a real 404.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[86px]" />
        ))}
      </div>

      <Skeleton className="h-[420px]" />
    </div>
  );
}
