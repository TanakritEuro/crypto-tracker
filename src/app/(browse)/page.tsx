import Link from "next/link";

import { MarketTable } from "@/components/MarketTable";
import { Delta } from "@/components/ui/Delta";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { ErrorNotice } from "@/components/ui/Feedback";
import { StatTile } from "@/components/ui/StatTile";
import {
  getGlobalStats,
  getMarkets,
  getTrending,
  isRateLimited,
  type GlobalStats,
  type TrendingCoin,
} from "@/lib/coingecko";
import { formatCompactMoney, formatNumber } from "@/lib/format";
import { getCurrency } from "@/lib/preferences";
import { getWatchedIds } from "@/lib/queries";
import { getCurrentUser } from "@/lib/supabase/server";
import type { MarketCoin } from "@/lib/types";

export const metadata = {
  title: "Market",
  description:
    "Live cryptocurrency prices, market caps and 7-day trends for the top coins.",
};

// Prices go stale fast; the underlying fetches carry their own cache windows.
export const revalidate = 60;

export default async function MarketPage() {
  const currency = await getCurrency();

  // One failing call should not blank the page — each result is settled
  // independently and rendered or skipped on its own.
  const [marketsResult, globalResult, trendingResult, watchedIds, user] =
    await Promise.all([
      getMarkets({ currency, page: 1, perPage: 50 }).then(
        (coins) => ({ ok: true as const, coins }),
        (error: unknown) => ({ ok: false as const, error }),
      ),
      getGlobalStats(currency).then(
        (stats) => ({ ok: true as const, stats }),
        () => ({ ok: false as const }),
      ),
      getTrending().then(
        (coins) => ({ ok: true as const, coins }),
        () => ({ ok: false as const }),
      ),
      getWatchedIds(),
      getCurrentUser(),
    ]);

  const stats: GlobalStats | null = globalResult.ok ? globalResult.stats : null;
  const trending: TrendingCoin[] = trendingResult.ok ? trendingResult.coins : [];
  const coins: MarketCoin[] = marketsResult.ok ? marketsResult.coins : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Market</h1>
        <p className="mt-1 text-sm text-muted">
          Live prices across the top cryptocurrencies. Star a coin to watch it, or
          record a trade to track it in your portfolio.
        </p>
      </header>

      {stats ? (
        <section aria-label="Global market statistics">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Total market cap"
              value={formatCompactMoney(stats.marketCap, currency)}
              delta={<Delta value={stats.marketCapChange24h} />}
              hint="vs 24h ago"
            />
            <StatTile
              label="24h volume"
              value={formatCompactMoney(stats.volume24h, currency)}
            />
            <StatTile
              label="BTC dominance"
              value={`${formatNumber(stats.btcDominance, 1)}%`}
              hint={`ETH ${formatNumber(stats.ethDominance, 1)}%`}
            />
            <StatTile
              label="Tracked coins"
              value={formatNumber(stats.activeCoins, 0)}
            />
          </div>
        </section>
      ) : null}

      {trending.length > 0 ? (
        <section
          aria-label="Trending coins"
          className="rounded-xl border border-edge bg-surface px-4 py-3 sm:px-5"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-xs font-medium text-muted">Trending searches</span>
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {trending.map((coin) => (
                <li key={coin.id}>
                  <Link
                    href={`/coins/${coin.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-edge px-2 py-1 text-xs text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <CoinIcon src={coin.thumb} symbol={coin.symbol} size={14} />
                    <span className="font-medium">{coin.symbol.toUpperCase()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {marketsResult.ok ? (
        <MarketTable
          // Remount on a currency change: the loaded page and its prices are
          // denominated in the old one.
          key={currency}
          initialCoins={coins}
          currency={currency}
          watchedIds={watchedIds}
          signedIn={!!user}
        />
      ) : (
        <ErrorNotice
          title={
            isRateLimited(marketsResult.error)
              ? "Rate limited by CoinGecko"
              : "Couldn't load market data"
          }
          message={
            marketsResult.error instanceof Error
              ? marketsResult.error.message
              : "Something went wrong reaching CoinGecko."
          }
        />
      )}
    </div>
  );
}
