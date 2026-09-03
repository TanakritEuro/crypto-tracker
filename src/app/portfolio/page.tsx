import { redirect } from "next/navigation";

import { PortfolioClient } from "@/components/portfolio/PortfolioClient";
import type { DialogCoin } from "@/components/portfolio/TransactionDialog";
import { SupabaseSetupNotice } from "@/components/SupabaseSetupNotice";
import { ErrorNotice } from "@/components/ui/Feedback";
import { getMarketChart, getMarkets } from "@/lib/coingecko";
import {
  buildPortfolioHistory,
  buildPortfolioSummary,
  derivePortfolioCurrency,
  findMixedCurrencies,
} from "@/lib/portfolio";
import { getCurrency } from "@/lib/preferences";
import { getTransactions } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";
import type { ChartPoint, Currency, MarketCoin } from "@/lib/types";

export const metadata = {
  title: "Portfolio",
  description:
    "Your holdings, cost basis and profit/loss, derived from the transactions you record.",
};

// Always reflects the signed-in user's own data.
export const dynamic = "force-dynamic";

const ALLOWED_RANGES = [7, 30, 90, 365];
const DEFAULT_RANGE = 30;

/**
 * How many coins get a historical price series.
 *
 * Each one is a separate CoinGecko request, and the free tier throttles
 * aggressively. The largest positions dominate the shape of the line, so the
 * long tail is left out of the *chart* — every position is still counted in
 * full in the totals and the holdings table.
 */
const MAX_HISTORY_COINS = 12;

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; coin?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <div className="py-8">
        <SupabaseSetupNotice />
      </div>
    );
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portfolio");

  const { range, coin: prefillCoinId } = await searchParams;
  const requestedRange = Number(range);
  const days = ALLOWED_RANGES.includes(requestedRange) ? requestedRange : DEFAULT_RANGE;

  const [displayCurrency, transactions] = await Promise.all([
    getCurrency(),
    getTransactions(),
  ]);

  // Value the portfolio in the header's currency when there is anything to show
  // there; otherwise fall back to whichever currency the transactions actually
  // use, so switching the header to an unused currency doesn't blank the page.
  const hasInDisplayCurrency = transactions.some((tx) => tx.currency === displayCurrency);
  const currency: Currency = hasInDisplayCurrency
    ? displayCurrency
    : derivePortfolioCurrency(transactions, displayCurrency);

  const mixedCurrencies = findMixedCurrencies(transactions, currency);
  const coinIds = [...new Set(transactions.map((tx) => tx.coin_id))];

  // Live prices for every transacted coin, in a single request.
  let priceRows: MarketCoin[] = [];
  let priceError: string | null = null;
  if (coinIds.length > 0) {
    try {
      priceRows = await getMarkets({
        currency,
        ids: coinIds,
        perPage: coinIds.length,
        sparkline: false,
      });
    } catch (error) {
      priceError =
        error instanceof Error ? error.message : "Could not load current prices.";
    }
  }

  const prices = new Map(priceRows.map((row) => [row.id, row]));
  const summary = buildPortfolioSummary({ transactions, prices, currency });

  // Historical series for the value chart, biggest positions first.
  const historyCoinIds = summary.holdings
    .slice(0, MAX_HISTORY_COINS)
    .map((holding) => holding.coinId);

  const seriesEntries = await Promise.all(
    historyCoinIds.map(async (id) => {
      try {
        return [id, await getMarketChart(id, currency, days)] as const;
      } catch {
        // One missing series shouldn't lose the whole chart.
        return [id, [] as ChartPoint[]] as const;
      }
    }),
  );

  const livePrices = new Map(
    priceRows
      .filter((row) => typeof row.current_price === "number")
      .map((row) => [row.id, row.current_price as number]),
  );

  const history = buildPortfolioHistory({
    // Only the coins with a series contribute to the line; including the rest
    // would make the chart's value silently lower than the headline total.
    transactions: transactions.filter((tx) => historyCoinIds.includes(tx.coin_id)),
    series: new Map(seriesEntries),
    days,
    currency,
    livePrices,
  });

  // Resolve ?coin=<id> into something the dialog can prefill with.
  let prefillCoin: DialogCoin | null = null;
  if (prefillCoinId) {
    const known = transactions.find((tx) => tx.coin_id === prefillCoinId);
    if (known) {
      prefillCoin = {
        id: known.coin_id,
        symbol: known.coin_symbol,
        name: known.coin_name,
        image: known.coin_image,
      };
    } else {
      try {
        const [row] = await getMarkets({
          currency,
          ids: [prefillCoinId],
          perPage: 1,
          sparkline: false,
        });
        if (row) {
          prefillCoin = {
            id: row.id,
            symbol: row.symbol,
            name: row.name,
            image: row.image,
          };
        }
      } catch {
        // Fall through — the dialog opens with an empty coin picker.
      }
    }
  }

  return (
    <div className="space-y-6">
      {priceError ? (
        <ErrorNotice
          title="Prices are stale"
          message={`${priceError} Holdings are shown at cost until prices load.`}
        />
      ) : null}

      <PortfolioClient
        summary={summary}
        transactions={transactions}
        currency={currency}
        history={history}
        days={days}
        prefillCoin={prefillCoin}
        openOnLoad={!!prefillCoinId}
        mixedCurrencies={mixedCurrencies}
      />
    </div>
  );
}
