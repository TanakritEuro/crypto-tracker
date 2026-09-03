import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

/**
 * Runs before every matched request: refreshes the Supabase session cookie and
 * gates the signed-in routes.
 *
 * (Next 16 renamed this file convention from `middleware` to `proxy`; the
 * behaviour is unchanged.)
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files — those never carry a
     * session, and refreshing on them wastes a Supabase round trip.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
