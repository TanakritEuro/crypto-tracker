import { cookies } from "next/headers";

import { isCurrency, type Currency } from "./types";

/**
 * The display currency lives in a cookie rather than localStorage so the first
 * server render already knows it — otherwise every price would flash in USD
 * before hydrating into the chosen currency.
 */
export const CURRENCY_COOKIE = "ct-currency";

export async function getCurrency(): Promise<Currency> {
  const store = await cookies();
  const value = store.get(CURRENCY_COOKIE)?.value;
  return isCurrency(value) ? value : "usd";
}
