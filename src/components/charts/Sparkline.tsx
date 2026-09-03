/**
 * A 7-day price trace, sized for a table cell.
 *
 * Hand-rolled SVG rather than a chart library: this renders once per row on a
 * 100-row table, and it needs no axes, tooltip or legend — the row's price and
 * change columns carry the values.
 */
export function Sparkline({
  data,
  width = 120,
  height = 34,
  trend,
  className = "",
}: {
  data: number[] | null | undefined;
  width?: number;
  height?: number;
  /** Direction the line represents; drives the stroke color. */
  trend: "up" | "down" | "flat";
  className?: string;
}) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className={className} aria-hidden />;
  }

  // Downsample: 7d sparkline payloads carry ~168 points, far more than a
  // 120px-wide trace can show.
  const maxPoints = Math.floor(width / 2);
  const stride = Math.max(1, Math.ceil(data.length / maxPoints));
  const points = data.filter((_, i) => i % stride === 0 || i === data.length - 1);

  let min = Infinity;
  let max = -Infinity;
  for (const value of points) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return <div style={{ width, height }} className={className} aria-hidden />;
  }

  // A dead-flat series would divide by zero; center it instead.
  const range = max - min || 1;
  const padding = 2;
  const usableHeight = height - padding * 2;
  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  const d = points
    .map((value, i) => {
      const x = i * stepX;
      const y = padding + usableHeight - ((value - min) / range) * usableHeight;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const stroke =
    trend === "up" ? "var(--gain)" : trend === "down" ? "var(--loss)" : "var(--muted)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
      focusable="false"
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
