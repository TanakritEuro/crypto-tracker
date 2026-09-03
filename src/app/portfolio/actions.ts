"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { CURRENCIES, type TransactionInput } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const CURRENCY_CODES = new Set(CURRENCIES.map((c) => c.code));

/**
 * Validates form input before it reaches the database.
 *
 * The table has CHECK constraints covering the same ground — this layer exists
 * to turn a violation into a readable message instead of a Postgres error
 * string, not to replace them.
 */
function parseTransaction(formData: FormData):
  | { ok: true; value: TransactionInput }
  | { ok: false; error: string } {
  const coinId = String(formData.get("coin_id") ?? "").trim();
  const coinSymbol = String(formData.get("coin_symbol") ?? "").trim();
  const coinName = String(formData.get("coin_name") ?? "").trim();
  const coinImage = String(formData.get("coin_image") ?? "").trim();

  if (!coinId || !coinSymbol || !coinName) {
    return { ok: false, error: "Pick a coin first." };
  }

  const type = String(formData.get("type") ?? "");
  if (type !== "buy" && type !== "sell") {
    return { ok: false, error: "Transaction type must be buy or sell." };
  }

  const quantity = Number(formData.get("quantity"));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "Quantity must be a number greater than zero." };
  }

  const price = Number(formData.get("price_per_coin"));
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Price per coin must be zero or more." };
  }

  const feeRaw = formData.get("fee");
  const fee = feeRaw === null || feeRaw === "" ? 0 : Number(feeRaw);
  if (!Number.isFinite(fee) || fee < 0) {
    return { ok: false, error: "Fee must be zero or more." };
  }

  const currency = String(formData.get("currency") ?? "usd");
  if (!CURRENCY_CODES.has(currency as never)) {
    return { ok: false, error: "Unsupported currency." };
  }

  const executedRaw = String(formData.get("executed_at") ?? "").trim();
  const executedAt = executedRaw ? new Date(executedRaw) : new Date();
  if (Number.isNaN(executedAt.getTime())) {
    return { ok: false, error: "Enter a valid date and time." };
  }
  // A future-dated transaction breaks the history chart, which only plots up to
  // now — it would silently never appear.
  if (executedAt.getTime() > Date.now() + 60_000) {
    return { ok: false, error: "Transaction date cannot be in the future." };
  }

  const notes = String(formData.get("notes") ?? "").trim();

  return {
    ok: true,
    value: {
      coin_id: coinId,
      coin_symbol: coinSymbol,
      coin_name: coinName,
      coin_image: coinImage || null,
      type,
      quantity,
      price_per_coin: price,
      fee,
      currency: currency as TransactionInput["currency"],
      executed_at: executedAt.toISOString(),
      notes: notes || null,
    },
  };
}

export async function addTransaction(formData: FormData): Promise<ActionResult> {
  const parsed = parseTransaction(formData);
  if (!parsed.ok) return parsed;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You need to be signed in." };

    const { error } = await supabase
      .from("transactions")
      .insert({ ...parsed.value, user_id: user.id });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/portfolio");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save transaction.",
    };
  }
}

export async function updateTransaction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseTransaction(formData);
  if (!parsed.ok) return parsed;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You need to be signed in." };

    // The `user_id` filter is belt-and-braces: RLS already scopes the update to
    // the caller's own rows.
    const { error } = await supabase
      .from("transactions")
      .update(parsed.value)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/portfolio");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update transaction.",
    };
  }
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You need to be signed in." };

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/portfolio");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not delete transaction.",
    };
  }
}
