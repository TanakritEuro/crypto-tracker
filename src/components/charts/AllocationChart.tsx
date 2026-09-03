"use client";

import { useMemo } from "react";

import { formatMoney, formatNumber } from "@/lib/format";
import type { Currency, Holding } from "@/lib/types";

/**
 * Portfolio composition.
 *
 * A stacked composition bar (the whole, at a glance) over a labelled row per
 * coin (the parts, with values). Not a pie: comparing angles is harder than
 * comparing bar lengths, and the rows carry the numbers a pie would need
 * callouts for.
 *
 * Categorical hues are assigned in fixed slot order and never cycled — past
 * eight coins the tail folds into "Other" rather than repeating a color.
 */

const MAX_SLICES = 8;

interface Slice {
  key: string;
  label: string;
  sublabel: string;
  value: number;
  percent: number;
  color: string;
}

export function AllocationChart({
  holdings,
  currency,
  totalValue,
}: {
  holdings: Holding[];
  currency: Currency;
  totalValue: number;
}) {
  const slices = useMemo<Slice[]>(() => {
    if (totalValue <= 0) return [];

    const sorted = [...holdings]
      .filter((h) => h.value > 0)
      .sort((a, b) => b.value - a.value);

    const head = sorted.slice(0, MAX_SLICES).map((holding, i) => ({
      key: holding.coinId,
      label: holding.symbol.toUpperCase(),
      sublabel: holding.name,
      value: holding.value,
      percent: (holding.value / totalValue) * 100,
      color: `var(--series-${i + 1})`,
    }));

    const tail = sorted.slice(MAX_SLICES);
    if (tail.length > 0) {
      const value = tail.reduce((sum, h) => sum + h.value, 0);
      head.push({
        key: "__other",
        label: "Other",
        sublabel: `${tail.length} more ${tail.length === 1 ? "coin" : "coins"}`,
        value,
        percent: (value / totalValue) * 100,
        color: "var(--series-other)",
      });
    }

    return head;
  }, [holdings, totalValue]);

  if (slices.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted sm:px-5">
        Nothing to allocate yet.
      </p>
    );
  }

  return (
    <div className="px-4 py-4 sm:px-5">
      {/* Composition bar. The 2px gaps are surface showing through — segments
          read as separate because of the gap, not because of a stroke. */}
      <div
        className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={slices
          .map((s) => `${s.sublabel} ${formatNumber(s.percent, 1)}%`)
          .join(", ")}
      >
        {slices.map((slice) => (
          <span
            key={slice.key}
            title={`${slice.sublabel} · ${formatNumber(slice.percent, 1)}%`}
            style={{
              width: `${slice.percent}%`,
              background: slice.color,
              // Keep a hairline slice visible rather than collapsing to nothing.
              minWidth: 3,
            }}
            className="first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>

      {/* The rows double as the legend — identity never rests on color alone. */}
      <ul className="mt-4 space-y-2">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: slice.color }}
            />
            <span className="w-16 shrink-0 truncate text-xs font-medium text-ink">
              {slice.label}
            </span>

            <span className="h-1.5 min-w-0 flex-1 rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full"
                style={{ width: `${slice.percent}%`, background: slice.color }}
              />
            </span>

            <span className="tnum w-12 shrink-0 text-right text-xs font-medium text-ink">
              {formatNumber(slice.percent, 1)}%
            </span>
            <span className="tnum hidden w-24 shrink-0 text-right text-xs text-muted sm:block">
              {formatMoney(slice.value, currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
