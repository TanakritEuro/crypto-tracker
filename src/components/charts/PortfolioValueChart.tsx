"use client";

import { useId, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatChartTime, formatChartTooltipTime, formatCompactMoney, formatMoney } from "@/lib/format";
import type { HistoryPoint } from "@/lib/portfolio";
import type { Currency } from "@/lib/types";

import { ChartTooltip } from "./ChartTooltip";

/**
 * Portfolio value against net invested capital.
 *
 * Two series, so a legend is always present. The gap between the lines *is* the
 * unrealized profit — plotting them on one shared axis is the point, and is why
 * this is one chart rather than two.
 *
 * Net invested is drawn as a step: it only changes when a transaction happens,
 * and interpolating between those moments would imply money moving that didn't.
 */
export function PortfolioValueChart({
  points,
  currency,
  days,
  height = 300,
}: {
  points: HistoryPoint[];
  currency: Currency;
  days: number;
  height?: number;
}) {
  const gradientId = useId().replace(/:/g, "");

  const [yMin, yMax] = useMemo(() => {
    if (points.length === 0) return [0, 1];
    let min = Infinity;
    let max = -Infinity;
    for (const p of points) {
      min = Math.min(min, p.value, p.invested);
      max = Math.max(max, p.value, p.invested);
    }
    const pad = (max - min || Math.abs(max) * 0.05 || 1) * 0.1;
    return [Math.max(0, min - pad), max + pad];
  }, [points]);

  if (points.length < 2) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center px-6 text-center text-sm text-muted"
      >
        Add a couple of transactions to see how your portfolio has tracked over time.
      </div>
    );
  }

  const valueColor = "var(--series-1)";
  const investedColor = "var(--series-2)";

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 px-3 text-xs">
        <span className="flex items-center gap-1.5 text-ink-2">
          <span
            aria-hidden
            className="h-0.5 w-3.5 rounded-full"
            style={{ background: valueColor }}
          />
          Portfolio value
        </span>
        <span className="flex items-center gap-1.5 text-ink-2">
          <span
            aria-hidden
            className="h-0.5 w-3.5 rounded-full"
            style={{ background: investedColor }}
          />
          Net invested
        </span>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={valueColor} stopOpacity={0.16} />
                <stop offset="100%" stopColor={valueColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />

            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t: number) => formatChartTime(t, days)}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--axis)" }}
              minTickGap={44}
              tickMargin={8}
            />

            {/* One axis, shared by both series — never a second y-scale. */}
            <YAxis
              domain={[yMin, yMax]}
              tickFormatter={(v: number) => formatCompactMoney(v, currency)}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={72}
              orientation="right"
              tickMargin={4}
            />

            <Tooltip
              cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
              isAnimationActive={false}
              content={
                <ChartTooltip
                  labelFormatter={(t) => formatChartTooltipTime(t, days)}
                  rows={[
                    {
                      key: "value",
                      label: "Value",
                      color: valueColor,
                      format: (v) => formatMoney(v, currency),
                    },
                    {
                      key: "invested",
                      label: "Net invested",
                      color: investedColor,
                      format: (v) => formatMoney(v, currency),
                    },
                  ]}
                />
              }
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={valueColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              activeDot={{
                r: 4,
                fill: valueColor,
                stroke: "var(--surface)",
                strokeWidth: 2,
              }}
            />

            <Line
              type="stepAfter"
              dataKey="invested"
              stroke={investedColor}
              strokeWidth={2}
              strokeLinecap="round"
              dot={false}
              isAnimationActive={false}
              activeDot={{
                r: 4,
                fill: investedColor,
                stroke: "var(--surface)",
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
