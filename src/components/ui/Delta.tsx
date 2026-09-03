import { direction, formatPercent, formatSignedMoney } from "@/lib/format";
import type { Currency } from "@/lib/types";

/**
 * A signed change. Direction is carried by three channels — the arrow glyph,
 * the sign, and the color — so it never depends on color alone.
 */
export function Delta({
  value,
  digits = 2,
  className = "",
  showArrow = true,
}: {
  value: number | null | undefined;
  digits?: number;
  className?: string;
  showArrow?: boolean;
}) {
  const dir = direction(value);
  const color =
    dir === "up" ? "text-gain" : dir === "down" ? "text-loss" : "text-muted";
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "•";

  return (
    <span className={`tnum inline-flex items-center gap-1 ${color} ${className}`}>
      {showArrow ? (
        <span aria-hidden className="text-[0.7em] leading-none">
          {arrow}
        </span>
      ) : null}
      {formatPercent(value, digits)}
    </span>
  );
}

/** The same treatment for an absolute money change. */
export function DeltaMoney({
  value,
  currency,
  className = "",
}: {
  value: number | null | undefined;
  currency: Currency;
  className?: string;
}) {
  const dir = direction(value);
  const color =
    dir === "up" ? "text-gain" : dir === "down" ? "text-loss" : "text-muted";

  return (
    <span className={`tnum ${color} ${className}`}>
      {formatSignedMoney(value, currency)}
    </span>
  );
}
