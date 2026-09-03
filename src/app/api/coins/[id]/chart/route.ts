import { NextResponse, type NextRequest } from "next/server";

import { getMarketChart } from "@/lib/coingecko";
import { isCurrency } from "@/lib/types";

import { errorResponse } from "../../../_lib/respond";

/** Allowed ranges, in days. Mirrors the range selector in the UI. */
const RANGES = new Set([1, 7, 30, 90, 365, 1825]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;

  const currencyParam = searchParams.get("currency");
  const currency = isCurrency(currencyParam) ? currencyParam : "usd";

  const requested = Number(searchParams.get("days") ?? "30");
  const days = RANGES.has(requested) ? requested : 30;

  try {
    const points = await getMarketChart(id, currency, days);
    return NextResponse.json({ points, days, currency });
  } catch (error) {
    return errorResponse(error);
  }
}
