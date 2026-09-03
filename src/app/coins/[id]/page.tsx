import { ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CoinChartCard } from "@/components/CoinChartCard";
import { WatchButton } from "@/components/WatchButton";
import { Card, CardHeader } from "@/components/ui/Card";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { Delta } from "@/components/ui/Delta";
import { ErrorNotice } from "@/components/ui/Feedback";
import { HeroFigure } from "@/components/ui/StatTile";
import { CoinGeckoError, getCoinDetail, getMarketChart } from "@/lib/coingecko";
import {
  formatCompactMoney,
  formatCompactNumber,
  formatDate,
  formatPrice,
} from "@/lib/format";
import { getCurrency } from "@/lib/preferences";
import { getWatchedIds } from "@/lib/queries";
import { getCurrentUser } from "@/lib/supabase/server";
import type { Currency } from "@/lib/types";

const DEFAULT_DAYS = 30;

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const currency = await getCurrency();
    const coin = await getCoinDetail(id, currency);
    return {
      title: `${coin.name} (${coin.symbol.toUpperCase()})`,
      description: `${coin.name} price, market cap, supply and historical chart.`,
    };
  } catch {
    return { title: "Coin" };
  }
}

/** One row of the statistics grid. */
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-edge py-2.5 last:border-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tnum text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function ChangeCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-edge px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium">
        <Delta value={value} />
      </p>
    </div>
  );
}

export default async function CoinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currency: Currency = await getCurrency();

  let coin;
  try {
    coin = await getCoinDetail(id, currency);
  } catch (error) {
    if (error instanceof CoinGeckoError && error.status === 404) notFound();
    return (
      <ErrorNotice
        title="Couldn't load this coin"
        message={
          error instanceof Error
            ? error.message
            : "Something went wrong reaching CoinGecko."
        }
        action={
          <Link href="/" className="text-xs underline underline-offset-2">
            Back to market
          </Link>
        }
      />
    );
  }

  // The chart is secondary to the page — if only it fails, still render
  // everything else and let the card show an empty range.
  const [chartPoints, watchedIds, user] = await Promise.all([
    getMarketChart(id, currency, DEFAULT_DAYS).catch(() => []),
    getWatchedIds(),
    getCurrentUser(),
  ]);

  const supplyPercent =
    coin.maxSupply && coin.circulatingSupply
      ? (coin.circulatingSupply / coin.maxSupply) * 100
      : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <CoinIcon src={coin.image} symbol={coin.symbol} size={44} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                {coin.name}
              </h1>
              <span className="rounded-md border border-edge px-1.5 py-0.5 text-xs font-medium uppercase text-muted">
                {coin.symbol}
              </span>
              {coin.marketCapRank ? (
                <span className="tnum rounded-md bg-surface-2 px-1.5 py-0.5 text-xs text-ink-2">
                  Rank #{coin.marketCapRank}
                </span>
              ) : null}
            </div>

            <div className="mt-3">
              <HeroFigure
                label="Price"
                value={formatPrice(coin.price, currency)}
                delta={
                  <>
                    <Delta value={coin.changePercent["24h"]} className="text-sm" />
                    <span className="text-xs text-muted">past 24 hours</span>
                  </>
                }
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-edge bg-surface p-1">
            <WatchButton
              signedIn={!!user}
              watching={watchedIds.includes(coin.id)}
              size={18}
              coin={{
                coin_id: coin.id,
                coin_symbol: coin.symbol,
                coin_name: coin.name,
                coin_image: coin.image || null,
              }}
            />
          </div>
          <Link
            href={`/portfolio?coin=${encodeURIComponent(coin.id)}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            <Plus size={15} strokeWidth={2.5} />
            Add transaction
          </Link>
        </div>
      </header>

      <section aria-label="Price change by period">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <ChangeCell label="1 hour" value={coin.changePercent["1h"]} />
          <ChangeCell label="24 hours" value={coin.changePercent["24h"]} />
          <ChangeCell label="7 days" value={coin.changePercent["7d"]} />
          <ChangeCell label="30 days" value={coin.changePercent["30d"]} />
          <ChangeCell label="1 year" value={coin.changePercent["1y"]} />
        </div>
      </section>

      <CoinChartCard
        // Remount when the currency changes — the cached series are denominated
        // in the old one.
        key={currency}
        coinId={coin.id}
        coinName={coin.name}
        currency={currency}
        initialPoints={chartPoints}
        initialDays={DEFAULT_DAYS}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Market" />
          <dl className="px-4 py-1 sm:px-5">
            <Stat label="Market cap" value={formatCompactMoney(coin.marketCap, currency)} />
            <Stat
              label="Fully diluted valuation"
              value={formatCompactMoney(coin.fullyDilutedValuation, currency)}
            />
            <Stat label="24h volume" value={formatCompactMoney(coin.volume24h, currency)} />
            <Stat label="24h high" value={formatPrice(coin.high24h, currency)} />
            <Stat label="24h low" value={formatPrice(coin.low24h, currency)} />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Supply & records" />
          <dl className="px-4 py-1 sm:px-5">
            <Stat
              label="Circulating supply"
              value={
                <>
                  {formatCompactNumber(coin.circulatingSupply)}{" "}
                  <span className="text-xs uppercase text-muted">{coin.symbol}</span>
                  {supplyPercent !== null ? (
                    <span className="ml-1.5 text-xs text-muted">
                      ({supplyPercent.toFixed(1)}% of max)
                    </span>
                  ) : null}
                </>
              }
            />
            <Stat label="Total supply" value={formatCompactNumber(coin.totalSupply)} />
            <Stat
              label="Max supply"
              value={coin.maxSupply ? formatCompactNumber(coin.maxSupply) : "Unlimited"}
            />
            <Stat
              label="All-time high"
              value={
                <>
                  {formatPrice(coin.ath, currency)}{" "}
                  <Delta value={coin.athChangePercentage} className="ml-1 text-xs" />
                  <span className="ml-1.5 text-xs font-normal text-muted">
                    {formatDate(coin.athDate)}
                  </span>
                </>
              }
            />
            <Stat
              label="All-time low"
              value={
                <>
                  {formatPrice(coin.atl, currency)}{" "}
                  <Delta value={coin.atlChangePercentage} className="ml-1 text-xs" />
                  <span className="ml-1.5 text-xs font-normal text-muted">
                    {formatDate(coin.atlDate)}
                  </span>
                </>
              }
            />
          </dl>
        </Card>
      </div>

      {coin.description ? (
        <Card>
          <CardHeader
            title={`About ${coin.name}`}
            action={
              coin.homepage ? (
                <a
                  href={coin.homepage}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-xs text-ink-2 underline underline-offset-2 hover:text-ink"
                >
                  Website
                  <ExternalLink size={12} strokeWidth={2} />
                </a>
              ) : null
            }
          />
          <div className="px-4 py-4 sm:px-5">
            {coin.categories.length > 0 ? (
              <ul className="mb-3 flex flex-wrap gap-1.5">
                {coin.categories.map((category) => (
                  <li
                    key={category}
                    className="rounded-full border border-edge px-2 py-0.5 text-[11px] text-muted"
                  >
                    {category}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="max-w-3xl text-sm leading-relaxed text-ink-2">
              {coin.description.length > 700
                ? `${coin.description.slice(0, 700).trimEnd()}…`
                : coin.description}
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
