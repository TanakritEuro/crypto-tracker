import { Database } from "lucide-react";

/**
 * Shown wherever a signed-in feature is reached without Supabase credentials.
 * The market side of the app works without them, so this is a prompt rather
 * than a crash.
 */
export function SupabaseSetupNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-edge bg-surface px-5 py-6">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-ink-2">
        <Database size={17} strokeWidth={1.75} />
      </span>
      <h2 className="mt-3 text-base font-semibold text-ink">
        Connect a Supabase project
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
        Accounts, the portfolio and the watchlist are stored in Supabase. Market
        prices and charts work without it.
      </p>

      <ol className="mt-4 space-y-2.5 text-sm text-ink-2">
        <li className="flex gap-2.5">
          <span className="tnum shrink-0 text-muted">1.</span>
          <span>
            Create a free project at{" "}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2 hover:text-ink"
            >
              supabase.com
            </a>
            .
          </span>
        </li>
        <li className="flex gap-2.5">
          <span className="tnum shrink-0 text-muted">2.</span>
          <span>
            Run <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">supabase/schema.sql</code>{" "}
            in the SQL editor.
          </span>
        </li>
        <li className="flex gap-2.5">
          <span className="tnum shrink-0 text-muted">3.</span>
          <span>
            Copy the project URL and anon key into{" "}
            <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">.env.local</code>, then
            restart the dev server.
          </span>
        </li>
      </ol>

      <pre className="mt-4 overflow-x-auto rounded-lg border border-edge bg-plane px-3 py-2.5 text-[11px] leading-relaxed text-ink-2">
        <code>{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...`}</code>
      </pre>
    </div>
  );
}
