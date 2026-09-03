"use client";

import { useState } from "react";

/**
 * Coin logo with a lettered fallback. CoinGecko image URLs 404 often enough
 * that a broken-image icon would show up on real pages.
 */
export function CoinIcon({
  src,
  symbol,
  size = 24,
  className = "",
}: {
  src: string | null | undefined;
  symbol: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const letter = (symbol || "?").charAt(0).toUpperCase();

  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-semibold text-ink-2 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {letter}
      </span>
    );
  }

  // A plain <img> on purpose. next/image needs every remote host allow-listed
  // and throws at render time on one that isn't — CoinGecko serves logos from
  // several hosts, and a new one would take down the page. These are 14–44px
  // icons, so there is nothing meaningful to optimize.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
