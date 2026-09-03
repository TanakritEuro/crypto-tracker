import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  assertSupabaseConfigured,
  isSupabaseConfigured,
} from "./config";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 * Reads the session from cookies and writes refreshed tokens back where the
 * calling context allows it.
 */
export async function createClient() {
  assertSupabaseConfigured();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. The middleware refreshes the
          // session on every request, so it is safe to ignore here.
        }
      },
    },
  });
}

/**
 * The signed-in user, or null. Returns null rather than throwing when Supabase
 * is unconfigured, so shared layout chrome renders either way.
 *
 * Uses `getUser()` (which revalidates the token against Supabase) rather than
 * `getSession()` (which trusts the cookie) — cookies are attacker-writable.
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
