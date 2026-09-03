/** Shared shapes for CoinGecko responses and the portfolio domain. */

export type Currency = "usd" | "eur" | "gbp" | "jpy" | "thb";

export const CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: "usd", symbol: "$", label: "USD" },
  { code: "eur", symbol: "€", label: "EUR" },
  { code: "gbp", symbol: "£", label: "GBP" },
  { code: "jpy", symbol: "¥", label: "JPY" },
  { code: "thb", symbol: "฿", label: "THB" },
];

export function isCurrency(value: string | null | undefined): value is Currency {
  return !!value && CURRENCIES.some((c) => c.code === value);
}

/** A row from /coins/markets. */
export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
  total_volume: number | null;
  high_24h: number | null;
  low_24h: number | null;
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  ath_change_percentage: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_change_percentage: number | null;
  sparkline_in_7d?: { price: number[] } | null;
}

/** The trimmed detail payload our /api/coins/[id] route returns. */
export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  image: string;
  description: string;
  homepage: string | null;
  categories: string[];
  marketCapRank: number | null;
  price: number | null;
  marketCap: number | null;
  fullyDilutedValuation: number | null;
  volume24h: number | null;
  high24h: number | null;
  low24h: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  ath: number | null;
  athChangePercentage: number | null;
  athDate: string | null;
  atl: number | null;
  atlChangePercentage: number | null;
  atlDate: string | null;
  changePercent: {
    "1h": number | null;
    "24h": number | null;
    "7d": number | null;
    "30d": number | null;
    "1y": number | null;
  };
}

export interface ChartPoint {
  t: number;
  price: number;
}

export interface SearchResultCoin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  marketCapRank: number | null;
}

/* -------------------------------------------------------------------------- */
/* Portfolio                                                                   */
/* -------------------------------------------------------------------------- */

export type TransactionType = "buy" | "sell";

/** A transaction row as stored in Supabase. Amounts are in `currency`. */
export interface Transaction {
  id: string;
  user_id: string;
  coin_id: string;
  coin_symbol: string;
  coin_name: string;
  coin_image: string | null;
  type: TransactionType;
  quantity: number;
  price_per_coin: number;
  fee: number;
  currency: Currency;
  executed_at: string;
  notes: string | null;
  created_at: string;
}

/** The payload accepted by the transaction form / server actions. */
export interface TransactionInput {
  coin_id: string;
  coin_symbol: string;
  coin_name: string;
  coin_image: string | null;
  type: TransactionType;
  quantity: number;
  price_per_coin: number;
  fee: number;
  currency: Currency;
  executed_at: string;
  notes: string | null;
}

export interface WatchlistItem {
  user_id: string;
  coin_id: string;
  coin_symbol: string;
  coin_name: string;
  coin_image: string | null;
  created_at: string;
}

/** One coin's aggregated position, derived from its transactions. */
export interface Holding {
  coinId: string;
  symbol: string;
  name: string;
  image: string | null;
  /** Units currently held. */
  quantity: number;
  /** Average cost per unit of the units still held, fees included. */
  avgCost: number;
  /** quantity × avgCost — what the open position cost. */
  costBasis: number;
  /** Profit already banked by sells, fees included. */
  realizedPnl: number;
  /** Live price per unit, or null when the price lookup failed. */
  price: number | null;
  /** quantity × price. */
  value: number;
  /** value − costBasis. */
  unrealizedPnl: number;
  /** unrealizedPnl / costBasis, as a percentage. */
  unrealizedPnlPercent: number | null;
  /** Portion of the portfolio's total value, as a percentage. */
  allocation: number;
  change24h: number | null;
  transactionCount: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number | null;
  realizedPnl: number;
  /** Change in total value over the last 24h, in currency. */
  change24hValue: number;
  change24hPercent: number | null;
  holdings: Holding[];
  /** Positions fully sold off — they still carry realized P/L. */
  closedHoldings: Holding[];
}
