import type {
  ChartPoint,
  Currency,
  Holding,
  MarketCoin,
  PortfolioSummary,
  Transaction,
} from "./types";

/**
 * Portfolio maths.
 *
 * Positions are valued with the **average cost** method: every buy raises the
 * running average cost of the units held, and a sell removes units at that
 * average, banking the difference as realized P/L. Fees are folded into cost on
 * a buy and deducted from proceeds on a sell, so they always reduce profit.
 *
 * The alternative (FIFO lot tracking) gives different realized numbers and
 * matters for tax reporting; average cost is the right default for a personal
 * tracker because it needs no lot bookkeeping and is stable under edits.
 */

/**
 * Which currency the portfolio is denominated in.
 *
 * Transactions carry the currency they were entered in. Converting between them
 * would need historical FX rates we do not have, so rather than inventing a
 * number the portfolio picks one base currency — the one most transactions use
 * — and reports the rest separately. See `mixedCurrencies` on the result.
 */
export function derivePortfolioCurrency(
  transactions: Transaction[],
  fallback: Currency,
): Currency {
  if (transactions.length === 0) return fallback;

  const counts = new Map<Currency, number>();
  for (const tx of transactions) {
    counts.set(tx.currency, (counts.get(tx.currency) ?? 0) + 1);
  }

  let best: Currency = fallback;
  let bestCount = -1;
  for (const [currency, count] of counts) {
    if (count > bestCount) {
      best = currency;
      bestCount = count;
    }
  }
  return best;
}

/** Currencies present in the transactions other than the base one. */
export function findMixedCurrencies(
  transactions: Transaction[],
  base: Currency,
): Currency[] {
  const others = new Set<Currency>();
  for (const tx of transactions) {
    if (tx.currency !== base) others.add(tx.currency);
  }
  return [...others];
}

interface Position {
  coinId: string;
  symbol: string;
  name: string;
  image: string | null;
  quantity: number;
  /** Total cost of the units still held. */
  costBasis: number;
  realizedPnl: number;
  transactionCount: number;
}

/**
 * Replays transactions in chronological order into per-coin positions.
 * Exported for the history builder, which needs the same replay at many points
 * in time.
 */
function replay(transactions: Transaction[]): Map<string, Position> {
  const positions = new Map<string, Position>();

  // Chronological order is what makes average cost meaningful — a sell must see
  // the average produced by the buys that preceded it.
  const ordered = [...transactions].sort(
    (a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime(),
  );

  for (const tx of ordered) {
    let position = positions.get(tx.coin_id);
    if (!position) {
      position = {
        coinId: tx.coin_id,
        symbol: tx.coin_symbol,
        name: tx.coin_name,
        image: tx.coin_image,
        quantity: 0,
        costBasis: 0,
        realizedPnl: 0,
        transactionCount: 0,
      };
      positions.set(tx.coin_id, position);
    }

    // Keep the display metadata fresh — the newest transaction wins.
    position.symbol = tx.coin_symbol || position.symbol;
    position.name = tx.coin_name || position.name;
    position.image = tx.coin_image ?? position.image;
    position.transactionCount += 1;

    const quantity = Math.abs(tx.quantity);
    const fee = Math.abs(tx.fee || 0);

    if (tx.type === "buy") {
      position.quantity += quantity;
      position.costBasis += quantity * tx.price_per_coin + fee;
      continue;
    }

    // Sell. Guard against selling more than is held (a mistyped entry, or a
    // transaction deleted out from under a later sell): remove at most what
    // the position holds so cost basis can never go negative.
    const sold = Math.min(quantity, position.quantity);
    const avgCost = position.quantity > 0 ? position.costBasis / position.quantity : 0;
    const costRemoved = avgCost * sold;
    const proceeds = sold * tx.price_per_coin - fee;

    position.realizedPnl += proceeds - costRemoved;
    position.quantity -= sold;
    position.costBasis -= costRemoved;

    // Floating-point dust: a fully closed position should read as exactly zero.
    if (position.quantity < 1e-12) {
      position.quantity = 0;
      position.costBasis = 0;
    }
  }

  return positions;
}

export interface BuildSummaryOptions {
  transactions: Transaction[];
  /** Live market rows for the transacted coins, keyed by coin id. */
  prices: Map<string, MarketCoin>;
  currency: Currency;
}

export function buildPortfolioSummary({
  transactions,
  prices,
  currency,
}: BuildSummaryOptions): PortfolioSummary {
  const relevant = transactions.filter((tx) => tx.currency === currency);
  const positions = [...replay(relevant).values()];

  const priced = positions.map((position) => {
    const market = prices.get(position.coinId);
    const price = market?.current_price ?? null;
    const value = price !== null ? position.quantity * price : 0;
    const unrealizedPnl = price !== null ? value - position.costBasis : 0;

    return {
      position,
      price,
      value,
      unrealizedPnl,
      change24h: market?.price_change_percentage_24h_in_currency ?? null,
    };
  });

  const open = priced.filter((p) => p.position.quantity > 0);
  const totalValue = open.reduce((sum, p) => sum + p.value, 0);

  const toHolding = (p: (typeof priced)[number]): Holding => ({
    coinId: p.position.coinId,
    symbol: p.position.symbol,
    name: p.position.name,
    image: p.position.image,
    quantity: p.position.quantity,
    avgCost: p.position.quantity > 0 ? p.position.costBasis / p.position.quantity : 0,
    costBasis: p.position.costBasis,
    realizedPnl: p.position.realizedPnl,
    price: p.price,
    value: p.value,
    unrealizedPnl: p.unrealizedPnl,
    unrealizedPnlPercent:
      p.position.costBasis > 0 ? (p.unrealizedPnl / p.position.costBasis) * 100 : null,
    allocation: totalValue > 0 ? (p.value / totalValue) * 100 : 0,
    change24h: p.change24h,
    transactionCount: p.position.transactionCount,
  });

  const holdings = open.map(toHolding).sort((a, b) => b.value - a.value);
  const closedHoldings = priced
    .filter((p) => p.position.quantity === 0)
    .map(toHolding)
    .sort((a, b) => b.realizedPnl - a.realizedPnl);

  const totalCostBasis = open.reduce((sum, p) => sum + p.position.costBasis, 0);
  const unrealizedPnl = totalValue - totalCostBasis;
  const realizedPnl = priced.reduce((sum, p) => sum + p.position.realizedPnl, 0);

  // 24h change of the *current* holdings: back out yesterday's value from each
  // coin's 24h percentage, then diff. Transactions made inside the window are
  // ignored, so this reads as "how did my current positions move", not a
  // time-weighted return.
  let value24hAgo = 0;
  let valueWithKnownChange = 0;
  for (const p of open) {
    if (p.change24h === null || p.price === null) continue;
    const factor = 1 + p.change24h / 100;
    if (factor <= 0) continue;
    value24hAgo += p.value / factor;
    valueWithKnownChange += p.value;
  }
  const change24hValue = valueWithKnownChange - value24hAgo;

  return {
    totalValue,
    totalCostBasis,
    unrealizedPnl,
    unrealizedPnlPercent:
      totalCostBasis > 0 ? (unrealizedPnl / totalCostBasis) * 100 : null,
    realizedPnl,
    change24hValue,
    change24hPercent: value24hAgo > 0 ? (change24hValue / value24hAgo) * 100 : null,
    holdings,
    closedHoldings,
  };
}

/* -------------------------------------------------------------------------- */
/* Value over time                                                             */
/* -------------------------------------------------------------------------- */

export interface HistoryPoint {
  t: number;
  /** Market value of everything held at that moment. */
  value: number;
  /** Net cash put in: buys (with fees) minus sell proceeds, cumulative. */
  invested: number;
}

/**
 * How many samples to plot for a range. Enough to read the shape, few enough
 * that the line stays a line rather than noise.
 */
function bucketCount(days: number): number {
  if (days <= 1) return 24;
  if (days <= 30) return Math.max(12, days);
  if (days <= 90) return 90;
  return 120;
}

/**
 * Price of `coinId` at time `t`, using the last sample at or before `t`.
 * Series are pre-sorted, so this is a linear walk rather than a search per
 * bucket.
 */
function makePriceReader(series: ChartPoint[]) {
  let cursor = 0;
  let last: number | null = null;
  return (t: number): number | null => {
    while (cursor < series.length && series[cursor].t <= t) {
      last = series[cursor].price;
      cursor += 1;
    }
    return last;
  };
}

export interface BuildHistoryOptions {
  transactions: Transaction[];
  /** Price series per coin id, each sorted ascending by timestamp. */
  series: Map<string, ChartPoint[]>;
  days: number;
  currency: Currency;
  /** Live price per coin, used to pin the final point to the current value. */
  livePrices?: Map<string, number>;
}

export function buildPortfolioHistory({
  transactions,
  series,
  days,
  currency,
  livePrices,
}: BuildHistoryOptions): HistoryPoint[] {
  const relevant = [...transactions]
    .filter((tx) => tx.currency === currency)
    .sort(
      (a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime(),
    );

  if (relevant.length === 0) return [];

  const now = Date.now();
  const firstTx = new Date(relevant[0].executed_at).getTime();
  // Never plot before the first transaction — a flat zero run adds no
  // information and squashes the part of the line that does.
  const start = Math.max(now - days * 86_400_000, firstTx);
  if (!(start < now)) return [];

  const count = bucketCount(days);
  const step = (now - start) / count;

  const coinIds = [...new Set(relevant.map((tx) => tx.coin_id))];
  const readers = new Map(
    coinIds.map((id) => [id, makePriceReader(series.get(id) ?? [])] as const),
  );

  // Running state, advanced alongside the buckets so each transaction is
  // applied exactly once across the whole walk.
  const quantities = new Map<string, number>(coinIds.map((id) => [id, 0]));
  let invested = 0;
  let txIndex = 0;

  const applyUpTo = (t: number) => {
    while (
      txIndex < relevant.length &&
      new Date(relevant[txIndex].executed_at).getTime() <= t
    ) {
      const tx = relevant[txIndex];
      const quantity = Math.abs(tx.quantity);
      const fee = Math.abs(tx.fee || 0);
      const held = quantities.get(tx.coin_id) ?? 0;

      if (tx.type === "buy") {
        quantities.set(tx.coin_id, held + quantity);
        invested += quantity * tx.price_per_coin + fee;
      } else {
        const sold = Math.min(quantity, held);
        quantities.set(tx.coin_id, held - sold);
        invested -= sold * tx.price_per_coin - fee;
      }
      txIndex += 1;
    }
  };

  const points: HistoryPoint[] = [];
  for (let i = 0; i <= count; i += 1) {
    const t = i === count ? now : start + step * i;
    applyUpTo(t);

    let value = 0;
    for (const [coinId, quantity] of quantities) {
      if (quantity <= 0) continue;
      // The final bucket uses the live price so the chart's right edge agrees
      // with the headline total; market_chart lags by a few minutes.
      const price =
        i === count && livePrices?.has(coinId)
          ? livePrices.get(coinId)!
          : readers.get(coinId)?.(t);
      if (price === null || price === undefined) continue;
      value += quantity * price;
    }

    points.push({ t, value, invested });
  }

  return points;
}
