import { NextResponse, type NextRequest } from "next/server";

import { searchCoins } from "@/lib/coingecko";

import { errorResponse } from "../_lib/respond";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ coins: [] });
  }

  try {
    return NextResponse.json({ coins: await searchCoins(query) });
  } catch (error) {
    return errorResponse(error);
  }
}
