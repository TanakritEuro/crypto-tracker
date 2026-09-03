"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { CURRENCIES, type Currency } from "@/lib/types";

const COOKIE = "ct-currency";
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Writes the choice to a cookie and re-renders on the server, so prices come
 * back already converted rather than being re-derived in the browser.
 */
export function CurrencySelect({ value }: { value: Currency }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onChange = (next: string) => {
    document.cookie = `${COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    startTransition(() => router.refresh());
  };

  return (
    <label className="relative">
      <span className="sr-only">Display currency</span>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 cursor-pointer appearance-none rounded-lg border border-edge bg-surface pl-2.5 pr-7 text-xs font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-60"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted"
      >
        ▼
      </span>
    </label>
  );
}
