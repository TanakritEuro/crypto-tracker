import { CURRENCIES, type Currency } from "./types";

export function currencySymbol(currency: Currency): string {
  return CURRENCIES.find((c) => c.code === currency)?.symbol ?? "$";
}

/**
 * Crypto prices span ten orders of magnitude, so a fixed decimal count is
 * always wrong for something. Pick the precision from the value: big numbers
 * get 2 decimals, sub-cent tokens get enough digits to stay distinguishable.
 */
function priceFractionDigits(value: number): number {
  const abs = Math.abs(value);
  if (abs === 0) return 2;
  if (abs >= 1000) return 2;
  if (abs >= 1) return 2;
  if (abs >= 0.01) return 4;
  if (abs >= 0.0001) return 6;
  return 8;
}

export function formatPrice(
  value: number | null | undefined,
  currency: Currency = "usd",
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const digits = priceFractionDigits(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Money where the exact cents matter (cost basis, P/L totals). */
export function formatMoney(
  value: number | null | undefined,
  currency: Currency = "usd",
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Scales a number to K/M/B/T and formats the mantissa with trimmed trailing
 * zeros — e.g. 8_500_000_000 -> "8.5B", 1_000_000_000_000 -> "1T".
 *
 * Deliberately hand-rolled rather than `Intl.NumberFormat({ notation:
 * "compact" })`: that delegates rounding and trailing-zero trimming to the
 * ICU data bundled with the running engine, which differs between Node (the
 * server render) and the browser (the client render) — the same market cap
 * can come out "$8.5B" on one and "$8.50B" on the other, and React's
 * hydration check treats that mismatch as an error. A manual implementation
 * produces the same string on every engine because it does the arithmetic
 * itself instead of asking the platform.
 */
function compactMantissa(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  const [scaled, suffix] =
    abs >= 1e12
      ? [abs / 1e12, "T"]
      : abs >= 1e9
        ? [abs / 1e9, "B"]
        : abs >= 1e6
          ? [abs / 1e6, "M"]
          : abs >= 1e3
            ? [abs / 1e3, "K"]
            : [abs, ""];

  if (!suffix) return `${sign}${scaled}`;

  // 2 decimals under 10, 1 under 100, none at or above — matches how these
  // values read most naturally at each magnitude.
  const digits = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  const fixed = scaled.toFixed(digits);
  // Only strip trailing zeros that follow a decimal point — a whole number
  // like "100" has no "." and must stay "100", not become "1".
  const trimmed = fixed.includes(".")
    ? fixed.replace(/0+$/, "").replace(/\.$/, "")
    : fixed;
  return `${sign}${trimmed}${suffix}`;
}

/** Money in a tile or axis label, where width is scarce: $4.2M, $12.9K. */
export function formatCompactMoney(
  value: number | null | undefined,
  currency: Currency = "usd",
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (Math.abs(value) < 1000) return formatMoney(value, currency);
  return `${currencySymbol(currency)}${compactMantissa(value)}`;
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (Math.abs(value) < 1000) {
    return new Intl.NumberFormat("en-US").format(value);
  }
  return compactMantissa(value);
}

export function formatNumber(
  value: number | null | undefined,
  maximumFractionDigits = 2,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

/** Coin quantities: keep small holdings readable without 8 zeros on whole units. */
export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 8;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

/** Always signed — the sign is half of what a percentage change communicates. */
export function formatPercent(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

export function formatSignedMoney(
  value: number | null | undefined,
  currency: Currency = "usd",
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatMoney(Math.abs(value), currency)}`;
}

/** "up" | "down" | "flat" — drives both the color token and the arrow glyph. */
export function direction(value: number | null | undefined): "up" | "down" | "flat" {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) {
    return "flat";
  }
  return value > 0 ? "up" : "down";
}

export function formatDate(iso: string | number | Date | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(iso: string | number | Date | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** Axis and tooltip labels: drop the year on intraday ranges, drop the clock on long ones. */
export function formatChartTime(t: number, days: number): string {
  const d = new Date(t);
  if (days <= 1) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  }
  if (days <= 90) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(d);
}

export function formatChartTooltipTime(t: number, days: number): string {
  const d = new Date(t);
  if (days <= 7) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/** `<input type="datetime-local">` wants a local-time string with no zone. */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
