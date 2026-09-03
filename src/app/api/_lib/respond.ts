import { NextResponse } from "next/server";

import { CoinGeckoError } from "@/lib/coingecko";

/**
 * Maps an upstream failure onto a response the client can render. Rate limits
 * are the common case on the free tier and deserve their own status so the UI
 * can say "try again in a moment" instead of "something went wrong".
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof CoinGeckoError) {
    const status = error.status === 429 ? 429 : error.status === 404 ? 404 : 502;
    return NextResponse.json({ error: error.message }, { status });
  }

  console.error("[api]", error);
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
