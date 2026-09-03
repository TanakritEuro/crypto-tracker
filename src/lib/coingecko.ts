import "server-only";

import type {
  ChartPoint,
  CoinDetail,
  Currency,
  MarketCoin,
  SearchResultCoin,
} from "./types";

/**
 * Server-side CoinGecko access.
 *
 * Every call goes through here rather than from the browser, for three reasons:
 * the API key never reaches the client, responses are cached on the server so a
 * page refresh doesn't spend a request, and rate-limit responses can be turned
 * into something the UI can render instead of an unhandled failure.
 */

const DEMO_BASE = "https://api.coingecko.com/api/v3";
const PRO_BASE = "https://pro-api.coingecko.com/api/v3";

const API_KEY = process.env.COINGECKO_API_KEY?.trim() || "";
const IS_PRO = process.env.COINGECKO_API_TIER?.trim().toLowerCase() === "pro";
const BASE_URL = IS_PRO ? PRO_BASE : DEMO_BASE;

/** Thrown for any non-2xx upstream response so routes can map it to a status. */
export class CoinGeckoError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CoinGeckoError";
  }
}

/** True when the failure is CoinGecko throttling us, not a bad request. */
export function isRateLimited(error: unknown): boolean {
  return error instanceof CoinGeckoError && error.status === 429;
}

async function cgFetch<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  revalidate: number,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { accept: "application/json" };
  if (API_KEY) {
    headers[IS_PRO ? "x-cg-pro-api-key" : "x-cg-demo-api-key"] = API_KEY;
  }

  const res = await fetch(url, {
    headers,
    // Cache on the server. Market data moves constantly but not per-request —
    // this is what keeps the free tier's rate limit workable.
    next: { revalidate },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const message =
      res.status === 429
        ? "CoinGecko rate limit reached. Wait a moment and try again."
        : `CoinGecko request failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`;
    throw new CoinGeckoError(message, res.status);
  }

  return (await res.json()) as T;
}

/* -------------------------------------------------------------------------- */
/* Markets                                                                     */
/* -------------------------------------------------------------------------- */

export interface MarketsOptions {
  currency: Currency;
  page?: number;
  perPage?: number;
  /** Restrict to specific coins — used to price a portfolio in one request. */
  ids?: string[];
  sparkline?: boolean;
  order?: string;
}

export async function getMarkets({
  currency,
  page = 1,
  perPage = 50,
  ids,
  sparkline = true,
  order = "market_cap_desc",
}: MarketsOptions): Promise<MarketCoin[]> {
  return cgFetch<MarketCoin[]>(
    "/coins/markets",
    {
      vs_currency: currency,
      order,
      per_page: Math.min(perPage, 250),
      page,
      sparkline,
      price_change_percentage: "1h,24h,7d",
      ids: ids?.length ? ids.join(",") : undefined,
    },
    60,
  );
}

/* -------------------------------------------------------------------------- */
/* Coin detail                                                                 */
/* -------------------------------------------------------------------------- */

interface RawCoinDetail {
  id: string;
  symbol: string;
  name: string;
  categories?: (string | null)[];
  description?: { en?: string };
  links?: { homepage?: string[] };
  image?: { large?: string; small?: string; thumb?: string };
  market_cap_rank?: number | null;
  market_data?: {
    current_price?: Record<string, number>;
    market_cap?: Record<string, number>;
    fully_diluted_valuation?: Record<string, number>;
    total_volume?: Record<string, number>;
    high_24h?: Record<string, number>;
    low_24h?: Record<string, number>;
    circulating_supply?: number | null;
    total_supply?: number | null;
    max_supply?: number | null;
    ath?: Record<string, number>;
    ath_change_percentage?: Record<string, number>;
    ath_date?: Record<string, string>;
    atl?: Record<string, number>;
    atl_change_percentage?: Record<string, number>;
    atl_date?: Record<string, string>;
    price_change_percentage_1h_in_currency?: Record<string, number>;
    price_change_percentage_24h_in_currency?: Record<string, number>;
    price_change_percentage_7d_in_currency?: Record<string, number>;
    price_change_percentage_30d_in_currency?: Record<string, number>;
    price_change_percentage_1y_in_currency?: Record<string, number>;
  };
}

function pick(
  map: Record<string, number> | Record<string, string> | undefined,
  currency: Currency,
): number | null {
  const value = map?.[currency];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pickDate(
  map: Record<string, string> | undefined,
  currency: Currency,
): string | null {
  return map?.[currency] ?? null;
}

/** CoinGecko descriptions ship with anchor tags; strip them for plain rendering. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getCoinDetail(
  id: string,
  currency: Currency,
): Promise<CoinDetail> {
  const raw = await cgFetch<RawCoinDetail>(
    `/coins/${encodeURIComponent(id)}`,
    {
      localization: false,
      tickers: false,
      market_data: true,
      community_data: false,
      developer_data: false,
      sparkline: false,
    },
    120,
  );

  const md = raw.market_data;
  const homepage = raw.links?.homepage?.find((h) => !!h) ?? null;

  return {
    id: raw.id,
    symbol: raw.symbol,
    name: raw.name,
    image: raw.image?.large ?? raw.image?.small ?? raw.image?.thumb ?? "",
    description: stripHtml(raw.description?.en ?? ""),
    homepage,
    categories: (raw.categories ?? []).filter((c): c is string => !!c).slice(0, 6),
    marketCapRank: raw.market_cap_rank ?? null,
    price: pick(md?.current_price, currency),
    marketCap: pick(md?.market_cap, currency),
    fullyDilutedValuation: pick(md?.fully_diluted_valuation, currency),
    volume24h: pick(md?.total_volume, currency),
    high24h: pick(md?.high_24h, currency),
    low24h: pick(md?.low_24h, currency),
    circulatingSupply: md?.circulating_supply ?? null,
    totalSupply: md?.total_supply ?? null,
    maxSupply: md?.max_supply ?? null,
    ath: pick(md?.ath, currency),
    athChangePercentage: pick(md?.ath_change_percentage, currency),
    athDate: pickDate(md?.ath_date, currency),
    atl: pick(md?.atl, currency),
    atlChangePercentage: pick(md?.atl_change_percentage, currency),
    atlDate: pickDate(md?.atl_date, currency),
    changePercent: {
      "1h": pick(md?.price_change_percentage_1h_in_currency, currency),
      "24h": pick(md?.price_change_percentage_24h_in_currency, currency),
      "7d": pick(md?.price_change_percentage_7d_in_currency, currency),
      "30d": pick(md?.price_change_percentage_30d_in_currency, currency),
      "1y": pick(md?.price_change_percentage_1y_in_currency, currency),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Market chart                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Longer ranges get cached longer — a year of daily candles changes far less
 * often than the last 24 hours.
 */
function chartRevalidate(days: number): number {
  if (days <= 1) return 120;
  if (days <= 30) return 600;
  return 3600;
}

export async function getMarketChart(
  id: string,
  currency: Currency,
  days: number,
): Promise<ChartPoint[]> {
  const raw = await cgFetch<{ prices?: [number, number][] }>(
    `/coins/${encodeURIComponent(id)}/market_chart`,
    { vs_currency: currency, days },
    chartRevalidate(days),
  );

  return (raw.prices ?? [])
    .filter(([t, price]) => Number.isFinite(t) && Number.isFinite(price))
    .map(([t, price]) => ({ t, price }));
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

export async function searchCoins(query: string): Promise<SearchResultCoin[]> {
  const raw = await cgFetch<{
    coins?: {
      id: string;
      name: string;
      symbol: string;
      thumb: string;
      market_cap_rank: number | null;
    }[];
  }>("/search", { query }, 300);

  return (raw.coins ?? []).slice(0, 20).map((c) => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    thumb: c.thumb,
    marketCapRank: c.market_cap_rank ?? null,
  }));
}

/* -------------------------------------------------------------------------- */
/* Global                                                                      */
/* -------------------------------------------------------------------------- */

export interface GlobalStats {
  marketCap: number | null;
  volume24h: number | null;
  marketCapChange24h: number | null;
  btcDominance: number | null;
  ethDominance: number | null;
  activeCoins: number | null;
}

export async function getGlobalStats(currency: Currency): Promise<GlobalStats> {
  const raw = await cgFetch<{
    data?: {
      total_market_cap?: Record<string, number>;
      total_volume?: Record<string, number>;
      market_cap_percentage?: Record<string, number>;
      market_cap_change_percentage_24h_usd?: number;
      active_cryptocurrencies?: number;
    };
  }>("/global", {}, 300);

  const d = raw.data;
  return {
    marketCap: pick(d?.total_market_cap, currency),
    volume24h: pick(d?.total_volume, currency),
    marketCapChange24h: d?.market_cap_change_percentage_24h_usd ?? null,
    btcDominance: d?.market_cap_percentage?.btc ?? null,
    ethDominance: d?.market_cap_percentage?.eth ?? null,
    activeCoins: d?.active_cryptocurrencies ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Trending                                                                    */
/* -------------------------------------------------------------------------- */

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  marketCapRank: number | null;
}

export async function getTrending(): Promise<TrendingCoin[]> {
  const raw = await cgFetch<{
    coins?: {
      item: {
        id: string;
        name: string;
        symbol: string;
        thumb: string;
        market_cap_rank: number | null;
      };
    }[];
  }>("/search/trending", {}, 600);

  return (raw.coins ?? []).slice(0, 7).map(({ item }) => ({
    id: item.id,
    name: item.name,
    symbol: item.symbol,
    thumb: item.thumb,
    marketCapRank: item.market_cap_rank ?? null,
  }));
}
