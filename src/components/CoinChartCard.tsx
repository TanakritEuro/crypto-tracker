"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { PriceChart } from "@/components/charts/PriceChart";
import { Delta } from "@/components/ui/Delta";
import { formatPrice } from "@/lib/format";
import type { ChartPoint, Currency } from "@/lib/types";

const RANGES = [
  { days: 1, label: "1D" },
  { days: 7, label: "7D" },
  { days: 30, label: "1M" },
  { days: 90, label: "3M" },
  { days: 365, label: "1Y" },
  { days: 1825, label: "5Y" },
];

/**
 * Price chart plus its range control. Ranges are switched client-side so the
 * whole page does not re-render; the initial range arrives pre-rendered from
 * the server.
 *
 * The parent keys this component by currency. Switching currency invalidates
 * both the plotted series and the per-range cache, and remounting is a cleaner
 * way to say that than reconciling the state by hand.
 */
export function CoinChartCard({
  coinId,
  coinName,
  currency,
  initialPoints,
  initialDays,
}: {
  coinId: string;
  coinName: string;
  currency: Currency;
  initialPoints: ChartPoint[];
  initialDays: number;
}) {
  const [days, setDays] = useState(initialDays);
  const [points, setPoints] = useState(initialPoints);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ranges already fetched, so flipping back and forth costs nothing.
  const cache = useRef(new Map<number, ChartPoint[]>([[initialDays, initialPoints]]));

  const select = useCallback(
    async (nextDays: number) => {
      setDays(nextDays);
      setError(null);

      const cached = cache.current.get(nextDays);
      if (cached) {
        setPoints(cached);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/coins/${encodeURIComponent(coinId)}/chart?days=${nextDays}&currency=${currency}`,
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Could not load price history.");
        const nextPoints: ChartPoint[] = body.points ?? [];
        cache.current.set(nextDays, nextPoints);
        setPoints(nextPoints);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load price history.");
      } finally {
        setLoading(false);
      }
    },
    [coinId, currency],
  );

  const first = points[0]?.price ?? null;
  const last = points[points.length - 1]?.price ?? null;
  const changeValue = first !== null && last !== null ? last - first : null;
  const changePercent =
    first !== null && last !== null && first !== 0 ? ((last - first) / first) * 100 : null;

  const rangeLabel = RANGES.find((r) => r.days === days)?.label ?? `${days}D`;

  return (
    <section className="rounded-xl border border-edge bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-edge px-4 py-3 sm:px-5">
        <div>
          {/* One series, so no legend — this title names what is plotted. */}
          <h2 className="text-sm font-semibold text-ink">
            {coinName} price · {rangeLabel}
          </h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            {changeValue !== null ? (
              <>
                <Delta value={changePercent} />
                <span>
                  {formatPrice(first, currency)} → {formatPrice(last, currency)}
                </span>
              </>
            ) : (
              "No data for this range"
            )}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Chart range"
          className="flex items-center gap-0.5 rounded-lg border border-edge p-0.5"
        >
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              role="tab"
              aria-selected={days === range.days}
              onClick={() => select(range.days)}
              disabled={loading}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
                days === range.days
                  ? "bg-surface-2 text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative px-2 py-4 sm:px-3">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/60">
            <Loader2 size={20} className="animate-spin text-muted" />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="px-3 py-12 text-center text-sm text-loss">
            {error}
          </p>
        ) : (
          <PriceChart points={points} currency={currency} days={days} />
        )}
      </div>
    </section>
  );
}
