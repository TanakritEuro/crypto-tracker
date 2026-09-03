import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="tnum text-5xl font-semibold tracking-tight text-ink">404</p>
      <div>
        <h1 className="text-base font-medium text-ink">We couldn&apos;t find that</h1>
        <p className="mt-1 text-sm text-muted">
          The page or coin you asked for doesn&apos;t exist.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
      >
        Back to market
      </Link>
    </div>
  );
}
