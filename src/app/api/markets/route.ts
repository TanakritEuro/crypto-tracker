import { NextResponse, type NextRequest } from "next/server";

import { getMarkets } from "@/lib/coingecko";
import { isCurrency } from "@/lib/types";

import { errorResponse } from "../_lib/respond";

/** Top coins by market cap, or a specific set via `?ids=`. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const currencyParam = searchParams.get("currency");
  const currency = isCurrency(currencyParam) ? currencyParam : "usd";

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(
    250,
    Math.max(1, Number(searchParams.get("perPage") ?? "50") || 50),
  );
  const idsParam = searchParams.get("ids");
  const ids = idsParam
    ? idsParam.split(",").map((id) => id.trim()).filter(Boolean)
    : undefined;

  try {
    const coins = await getMarkets({
      currency,
      page,
      perPage,
      ids,
      sparkline: searchParams.get("sparkline") !== "false",
    });
    return NextResponse.json({ coins });
  } catch (error) {
    return errorResponse(error);
  }
}
