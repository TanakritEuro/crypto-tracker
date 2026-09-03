import type { ReactNode } from "react";

/**
 * Label · value · optional delta. The form for a single number, where a chart
 * would be overkill.
 *
 * The value uses the font's proportional figures — `tabular-nums` gives every
 * digit the width of a zero, which reads loose at display sizes.
 */
export function StatTile({
  label,
  value,
  delta,
  hint,
  trend,
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  hint?: string;
  trend?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-edge bg-surface px-4 py-3.5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <p className="text-xl font-semibold tracking-tight text-ink">{value}</p>
        {trend}
      </div>
      {delta || hint ? (
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
          {delta}
          {hint ? <span className="text-muted">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/** The one number a view leads with. Exactly one per page. */
export function HeroFigure({
  label,
  value,
  delta,
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        {value}
      </p>
      {delta ? <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">{delta}</div> : null}
    </div>
  );
}
