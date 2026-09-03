"use client";

import { Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Sparkline } from "@/components/charts/Sparkline";
import { WatchButton } from "@/components/WatchButton";
import { Delta } from "@/components/ui/Delta";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { ErrorNotice } from "@/components/ui/Feedback";
import { direction, formatCompactMoney, formatPrice } from "@/lib/format";
import type { Currency, MarketCoin } from "@/lib/types";

const PER_PAGE = 50;

/** CoinGecko orders the query server-side; these are the ones it supports. */
const ORDERS = [
  { value: "market_cap_desc", label: "Market cap" },
  { value: "market_cap_asc", label: "Market cap (low first)" },
  { value: "volume_desc", label: "Volume" },
  { value: "volume_asc", label: "Volume (low first)" },
];

export function MarketTable({
  initialCoins,
  currency,
  watchedIds,
  signedIn,
}: {
  initialCoins: MarketCoin[];
  currency: Currency;
  watchedIds: string[];
  signedIn: boolean;
}) {
  const [coins, setCoins] = useState(initialCoins);
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState(ORDERS[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watched = new Set(watchedIds);

  // The first render matches what the server already sent; re-fetching it on
  // mount would waste a request and flash the table.
  const hydrated = useRef(false);

  const load = useCallback(
    async (nextPage: number, nextOrder: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          currency,
          page: String(nextPage),
          perPage: String(PER_PAGE),
          order: nextOrder,
        });
        const res = await fetch(`/api/markets?${params}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Could not load market data.");
        setCoins(body.coins ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load market data.");
      } finally {
        setLoading(false);
      }
    },
    [currency],
  );

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    load(page, order);
  }, [page, order, load]);

  return (
    <section className="rounded-xl border border-edge bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-ink">Market</h2>
          <p className="mt-0.5 text-xs text-muted">
            Ranks {(page - 1) * PER_PAGE + 1}–{(page - 1) * PER_PAGE + coins.length}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">Sort by</span>
            <select
              value={order}
              onChange={(e) => {
                setPage(1);
                setOrder(e.target.value);
              }}
              className="h-8 cursor-pointer appearance-none rounded-lg border border-edge bg-surface pl-2.5 pr-7 text-xs font-medium text-ink transition-colors hover:bg-surface-2"
            >
              {ORDERS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
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

          <button
            type="button"
            onClick={() => load(page, order)}
            disabled={loading}
            title="Refresh prices"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-edge text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} strokeWidth={2} />
            )}
            <span className="sr-only">Refresh prices</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <caption className="sr-only">
            Cryptocurrencies by {ORDERS.find((o) => o.value === order)?.label}, with
            price, recent change and 7-day trend.
          </caption>
          <thead>
            <tr className="border-b border-edge text-xs text-muted">
              <th scope="col" className="w-8 py-2.5 pl-4 pr-1 text-left font-medium sm:pl-5" />
              <th scope="col" className="w-10 py-2.5 pr-2 text-right font-medium">
                #
              </th>
              <th scope="col" className="py-2.5 pr-3 text-left font-medium">
                Coin
              </th>
              <th scope="col" className="py-2.5 pr-3 text-right font-medium">
                Price
              </th>
              <th scope="col" className="hidden py-2.5 pr-3 text-right font-medium lg:table-cell">
                1h
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
              <th scope="col" className="hidden py-2.5 pr-3 text-right font-medium xl:table-cell">
                Volume 24h
              </th>
              <th scope="col" className="py-2.5 pr-4 text-right font-medium sm:pr-5">
                <span className="sr-only">7-day trend</span>
                <span aria-hidden>Last 7d</span>
              </th>
            </tr>
          </thead>

          <tbody className={loading ? "opacity-55 transition-opacity" : "transition-opacity"}>
            {coins.map((coin) => {
              const change7d = coin.price_change_percentage_7d_in_currency ?? null;
              return (
                <tr
                  key={coin.id}
                  className="group border-b border-edge last:border-0 transition-colors hover:bg-surface-2"
                >
                  <td className="py-2.5 pl-4 pr-1 sm:pl-5">
                    <WatchButton
                      signedIn={signedIn}
                      watching={watched.has(coin.id)}
                      size={14}
                      coin={{
                        coin_id: coin.id,
                        coin_symbol: coin.symbol,
                        coin_name: coin.name,
                        coin_image: coin.image,
                      }}
                    />
                  </td>
                  <td className="tnum py-2.5 pr-2 text-right text-xs text-muted">
                    {coin.market_cap_rank ?? "—"}
                  </td>
                  <td className="py-2.5 pr-3">
                    <Link
                      href={`/coins/${coin.id}`}
                      className="flex items-center gap-2.5 outline-offset-4"
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
                  <td className="py-2.5 pr-3 text-right lg:table-cell hidden">
                    <Delta value={coin.price_change_percentage_1h_in_currency} />
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
                  <td className="tnum hidden py-2.5 pr-3 text-right text-ink-2 xl:table-cell">
                    {formatCompactMoney(coin.total_volume, currency)}
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

      <div className="flex items-center justify-between gap-3 border-t border-edge px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
          className="inline-flex h-8 items-center rounded-lg border border-edge px-3 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="tnum text-xs text-muted">Page {page}</span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={loading || coins.length < PER_PAGE}
          className="inline-flex h-8 items-center rounded-lg border border-edge px-3 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </section>
  );
}
