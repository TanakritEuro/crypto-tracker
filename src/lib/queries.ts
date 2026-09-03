import "server-only";

import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";
import type { Transaction, WatchlistItem } from "./types";

/**
 * Reads for the signed-in user.
 *
 * Each returns an empty result rather than throwing when Supabase is
 * unconfigured or nobody is signed in, so market pages render the same either
 * way — only the pages that require data redirect.
 */

export async function getWatchlist(): Promise<WatchlistItem[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[watchlist]", error.message);
      return [];
    }
    return (data ?? []) as WatchlistItem[];
  } catch {
    return [];
  }
}

export async function getWatchedIds(): Promise<string[]> {
  return (await getWatchlist()).map((item) => item.coin_id);
}

export async function getTransactions(): Promise<Transaction[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("executed_at", { ascending: false });

    if (error) {
      console.error("[transactions]", error.message);
      return [];
    }

    // Postgres `numeric` arrives as a string over the wire to preserve
    // precision; the portfolio maths needs numbers.
    return (data ?? []).map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      price_per_coin: Number(row.price_per_coin),
      fee: Number(row.fee ?? 0),
    })) as Transaction[];
  } catch {
    return [];
  }
}
