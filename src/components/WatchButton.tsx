"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleWatchlist, type WatchCoin } from "@/app/watchlist/actions";

/**
 * Star toggle with an optimistic flip — the round trip is a database write, and
 * waiting on it makes the star feel broken. Reverts if the write fails.
 */
export function WatchButton({
  coin,
  watching,
  signedIn,
  size = 16,
  className = "",
}: {
  coin: WatchCoin;
  watching: boolean;
  signedIn: boolean;
  size?: number;
  className?: string;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(watching);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = (e: React.MouseEvent) => {
    // The star often sits inside a linked row; don't navigate on toggle.
    e.preventDefault();
    e.stopPropagation();

    if (!signedIn) {
      router.push("/login?next=/watchlist");
      return;
    }

    const next = !optimistic;
    setOptimistic(next);
    setError(null);

    startTransition(async () => {
      const result = await toggleWatchlist(coin);
      if (!result.ok) {
        setOptimistic(!next);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const label = optimistic
    ? `Remove ${coin.coin_name} from watchlist`
    : `Add ${coin.coin_name} to watchlist`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={optimistic}
      aria-label={label}
      title={error ?? label}
      className={`inline-flex items-center justify-center rounded-md p-1 transition-colors disabled:opacity-60 ${
        optimistic
          ? "text-[var(--series-4)]"
          : "text-muted hover:text-ink-2"
      } ${className}`}
    >
      <Star
        size={size}
        strokeWidth={2}
        fill={optimistic ? "currentColor" : "none"}
      />
    </button>
  );
}
