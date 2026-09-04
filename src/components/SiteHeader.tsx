import { LogOut } from "lucide-react";
import Link from "next/link";

import { signOut } from "@/app/auth/actions";
import { getCurrency } from "@/lib/preferences";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

import { CurrencySelect } from "./CurrencySelect";
import { NavLinks } from "./NavLinks";
import { SearchDialog } from "./SearchDialog";
import { ThemeToggle } from "./ThemeToggle";

export async function SiteHeader() {
  const [currency, user] = await Promise.all([getCurrency(), getCurrentUser()]);

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-plane/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-ink"
        >
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[13px] font-bold text-accent-ink"
          >
            L
          </span>
          <span className="hidden text-sm sm:inline">Ledger</span>
        </Link>

        <div className="hidden sm:block">
          <NavLinks />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <SearchDialog />
          <CurrencySelect value={currency} />
          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {isSupabaseConfigured ? (
            user ? (
              <form action={signOut}>
                <button
                  type="submit"
                  title={`Sign out (${user.email ?? "signed in"})`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-edge bg-surface px-2.5 text-xs text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <LogOut size={13} strokeWidth={2} />
                  <span className="hidden lg:inline">Sign out</span>
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-8 items-center rounded-lg bg-accent px-3 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90"
              >
                Sign in
              </Link>
            )
          ) : null}
        </div>
      </div>

      {/* Nav moves below the brand row on small screens rather than crowding it. */}
      <div className="border-t border-edge px-4 py-1.5 sm:hidden">
        <NavLinks />
      </div>
    </header>
  );
}
