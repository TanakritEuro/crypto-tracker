import { Star } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Sparkline } from "@/components/charts/Sparkline";
import { SupabaseSetupNotice } from "@/components/SupabaseSetupNotice";
import { WatchButton } from "@/components/WatchButton";
import { Card } from "@/components/ui/Card";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { Delta } from "@/components/ui/Delta";
import { EmptyState, ErrorNotice } from "@/components/ui/Feedback";
import { getMarkets } from "@/lib/coingecko";
import { direction, formatCompactMoney, formatPrice } from "@/lib/format";
import { getCurrency } from "@/lib/preferences";
import { getWatchlist } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";
import type { MarketCoin } from "@/lib/types";

export const metadata = {
  title: "Watchlist",
  description: "Coins you follow, with live prices and 7-day trends.",
};

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="py-8">
        <SupabaseSetupNotice />
      </div>
    );
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/watchlist");

  const [currency, watchlist] = await Promise.all([getCurrency(), getWatchlist()]);

  let coins: MarketCoin[] = [];
  let error: string | null = null;

  if (watchlist.length > 0) {
    try {
      coins = await getMarkets({
        currency,
        ids: watchlist.map((item) => item.coin_id),
        perPage: watchlist.length,
      });
    } catch (err) {
      error = err instanceof Error ? err.message : "Could not load prices.";
    }
  }

  // Keep the user's own ordering (most recently starred first) rather than
  // CoinGecko's market-cap order.
  const bySortKey = new Map(watchlist.map((item, i) => [item.coin_id, i]));
  const ordered = [...coins].sort(
    (a, b) => (bySortKey.get(a.id) ?? 0) - (bySortKey.get(b.id) ?? 0),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Watchlist</h1>
        <p className="mt-1 text-sm text-muted">
          {watchlist.length === 0
            ? "Coins you star anywhere in the app show up here."
            : `${watchlist.length} coin${watchlist.length === 1 ? "" : "s"} you follow.`}
        </p>
      </header>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {watchlist.length === 0 ? (
          <EmptyState
            icon={<Star size={24} strokeWidth={1.5} />}
            title="Nothing on your watchlist"
            description="Star a coin from the market table or a coin page to follow it here."
            action={
              <Link
                href="/"
                className="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
              >
                Browse the market
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-edge text-xs text-muted">
                  <th scope="col" className="w-8 py-2.5 pl-4 pr-1 sm:pl-5" />
                  <th scope="col" className="py-2.5 pr-3 text-left font-medium">
                    Coin
                  </th>
                  <th scope="col" className="py-2.5 pr-3 text-right font-medium">
                    Price
                  </th>
                  <th scope="col" className="py-2.5 pr-3 text-right font-medium">
                    24h
                  </th>
                  <th scope="col" className="hidden py-2.5 pr-3 text-right font-medium sm:table-cell">
                    7d
                  </th>
                  <th scope="col" className="hidden py-2.5 pr-3 text-right font-medium md:table-cell">
                    Market cap
                  </th>
                  <th scope="col" className="py-2.5 pr-4 text-right font-medium sm:pr-5">
                    <span aria-hidden>Last 7d</span>
                    <span className="sr-only">7-day trend</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((coin) => {
                  const change7d = coin.price_change_percentage_7d_in_currency ?? null;
                  return (
                    <tr
                      key={coin.id}
                      className="group border-b border-edge last:border-0 transition-colors hover:bg-surface-2"
                    >
                      <td className="py-2.5 pl-4 pr-1 sm:pl-5">
                        <WatchButton
                          signedIn
                          watching
                          size={14}
                          coin={{
                            coin_id: coin.id,
                            coin_symbol: coin.symbol,
                            coin_name: coin.name,
                            coin_image: coin.image,
                          }}
                        />
                      </td>
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/coins/${coin.id}`}
                          className="flex items-center gap-2.5"
                        >
                          <CoinIcon src={coin.image} symbol={coin.symbol} size={24} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink group-hover:underline">
                              {coin.name}
                            </span>
                            <span className="block text-xs uppercase text-muted">
                              {coin.symbol}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="tnum py-2.5 pr-3 text-right font-medium text-ink">
                        {formatPrice(coin.current_price, currency)}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <Delta value={coin.price_change_percentage_24h_in_currency} />
                      </td>
                      <td className="hidden py-2.5 pr-3 text-right sm:table-cell">
                        <Delta value={change7d} />
                      </td>
                      <td className="tnum hidden py-2.5 pr-3 text-right text-ink-2 md:table-cell">
                        {formatCompactMoney(coin.market_cap, currency)}
                      </td>
                      <td className="py-2.5 pr-4 text-right sm:pr-5">
                        <div className="flex justify-end">
                          <Sparkline
                            data={coin.sparkline_in_7d?.price}
                            trend={direction(change7d)}
                            width={104}
                            height={30}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
