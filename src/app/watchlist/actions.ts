"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type WatchResult =
  | { ok: true; watching: boolean }
  | { ok: false; error: string };

export interface WatchCoin {
  coin_id: string;
  coin_symbol: string;
  coin_name: string;
  coin_image: string | null;
}

/** Adds the coin to the watchlist, or removes it if it is already there. */
export async function toggleWatchlist(coin: WatchCoin): Promise<WatchResult> {
  if (!coin.coin_id) return { ok: false, error: "Missing coin." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: "Sign in to build a watchlist." };
    }

    const { data: existing, error: readError } = await supabase
      .from("watchlist")
      .select("coin_id")
      .eq("user_id", user.id)
      .eq("coin_id", coin.coin_id)
      .maybeSingle();

    if (readError) return { ok: false, error: readError.message };

    if (existing) {
      const { error } = await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", user.id)
        .eq("coin_id", coin.coin_id);
      if (error) return { ok: false, error: error.message };

      revalidatePath("/watchlist");
      return { ok: true, watching: false };
    }

    const { error } = await supabase
      .from("watchlist")
      .insert({ ...coin, user_id: user.id });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/watchlist");
    return { ok: true, watching: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update watchlist.",
    };
  }
}
