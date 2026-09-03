"use client";

import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatChartTime, formatChartTooltipTime, formatPrice } from "@/lib/format";
import type { ChartPoint, Currency } from "@/lib/types";

import { ChartTooltip } from "./ChartTooltip";

/**
 * Price over time — one series, so no legend: the card's title names what is
 * plotted. Color carries direction over the selected range (up/down), which the
 * header's signed percentage states in text as well.
 */
export function PriceChart({
  points,
  currency,
  days,
  height = 320,
}: {
  points: ChartPoint[];
  currency: Currency;
  days: number;
  height?: number;
}) {
  const gradientId = useId().replace(/:/g, "");

  const trend = useMemo(() => {
    if (points.length < 2) return "flat" as const;
    const change = points[points.length - 1].price - points[0].price;
    if (change > 0) return "up" as const;
    if (change < 0) return "down" as const;
    return "flat" as const;
  }, [points]);

  const color =
    trend === "up" ? "var(--gain)" : trend === "down" ? "var(--loss)" : "var(--accent)";

  // Pad the domain so the line never runs along the frame edge.
  const [yMin, yMax] = useMemo(() => {
    if (points.length === 0) return [0, 1];
    let min = Infinity;
    let max = -Infinity;
    for (const p of points) {
      if (p.price < min) min = p.price;
      if (p.price > max) max = p.price;
    }
    const pad = (max - min || Math.abs(max) * 0.02 || 1) * 0.08;
    return [min - pad, max + pad];
  }, [points]);

  if (points.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-muted"
      >
        No price history for this range.
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              {/* A wash, not a saturated block. */}
              <stop offset="0%" stopColor={color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Horizontal hairlines only — vertical ones compete with the line. */}
          <CartesianGrid
            vertical={false}
            stroke="var(--grid)"
            strokeWidth={1}
          />

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

          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(v: number) => formatPrice(v, currency)}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={78}
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
                    key: "price",
                    label: "Price",
                    color,
                    format: (v) => formatPrice(v, currency),
                  },
                ]}
              />
            }
          />

          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            // The ring keeps the dot legible where it crosses the line, and
            // enlarges the hover target.
            activeDot={{
              r: 4,
              fill: color,
              stroke: "var(--surface)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
