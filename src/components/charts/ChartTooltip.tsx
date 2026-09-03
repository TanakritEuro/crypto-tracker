"use client";

interface TooltipRow {
  key: string;
  label: string;
  color: string;
  format: (value: number) => string;
}

interface RechartsPayloadItem {
  dataKey?: string | number;
  value?: number;
  payload?: Record<string, unknown>;
}

/**
 * Shared tooltip body for the Recharts charts.
 *
 * Identity comes from a colored key beside the label; the text itself stays in
 * ink tokens, since a light series hue is illegible as text on the surface.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  rows,
}: {
  active?: boolean;
  payload?: RechartsPayloadItem[];
  label?: number | string;
  labelFormatter: (label: number) => string;
  rows: TooltipRow[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const timestamp = typeof label === "number" ? label : Number(label);

  return (
    <div className="rounded-lg border border-edge-strong bg-surface px-3 py-2 shadow-lg">
      <p className="text-[11px] font-medium text-muted">
        {Number.isFinite(timestamp) ? labelFormatter(timestamp) : String(label ?? "")}
      </p>
      <div className="mt-1.5 space-y-1">
        {rows.map((row) => {
          const item = payload.find((p) => p.dataKey === row.key);
          if (!item || typeof item.value !== "number") return null;
          return (
            <div key={row.key} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden
                className="h-0.5 w-3 shrink-0 rounded-full"
                style={{ background: row.color }}
              />
              <span className="text-ink-2">{row.label}</span>
              <span className="tnum ml-auto pl-3 font-medium text-ink">
                {row.format(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
