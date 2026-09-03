# Ledger — crypto market & portfolio tracker

A cryptocurrency tracker with two halves: a public market browser (live prices,
charts, search, watchlist) and a private portfolio that derives holdings, cost
basis and profit/loss from the transactions you record.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4 and Supabase,
with market data from CoinGecko.

---

## What it does

**Market** — top coins by market cap or volume, paginated, with 1h/24h/7d change
and a 7-day sparkline per row. Global market cap, volume and BTC dominance sit
above it. ⌘K opens a search dialog over every coin CoinGecko knows about.

**Coin detail** — hero price with 24h change, change across five periods, and a
price chart with 1D → 5Y ranges and a crosshair tooltip. Market cap, FDV, supply
figures and all-time high/low with dates.

**Portfolio** — you record buys and sells; everything else is derived:

- **Holdings** with quantity, average cost, live price, market value and
  unrealized P/L per position.
- **Realized P/L**, banked when you sell, including positions you have fully
  closed out.
- **Value over time**, plotting market value against net invested capital on one
  shared axis — the gap between the two lines *is* the unrealized profit.
- **Allocation**, as a composition bar plus a labelled row per coin.

**Watchlist** — star a coin anywhere in the app to follow it without holding it.

Prices can be displayed in USD, EUR, GBP, JPY or THB. Light and dark themes both
follow the OS setting by default and can be overridden.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in the values below
npm run dev
```

Open <http://localhost:3000>. **Market prices and charts work immediately** —
Supabase is only needed for the portfolio and watchlist.

### 1. Supabase (for accounts, portfolio, watchlist)

1. Create a free project at [supabase.com](https://supabase.com/dashboard).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   `transactions` and `watchlist` tables and their row-level security policies.
3. From **Project Settings → API**, copy the project URL and the `anon` public
   key into `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   ```

4. Restart the dev server, then create an account at `/login`.

> By default Supabase emails a confirmation link on sign-up. For local
> development you can turn that off under **Authentication → Sign In / Providers
> → Email → Confirm email**.

### 2. CoinGecko (optional)

The public API needs no key and is enough for personal use, because responses
are cached on the server. If you hit rate limits, a free demo key raises the
ceiling — add it as `COINGECKO_API_KEY`.

---

## How it is put together

```
src/
├── app/
│   ├── page.tsx                    Market — global stats, trending, coin table
│   ├── coins/[id]/page.tsx         Coin detail — hero price, chart, stats
│   ├── portfolio/                  Portfolio page + transaction server actions
│   ├── watchlist/                  Watchlist page + toggle server action
│   ├── login/page.tsx              Email + password auth
│   └── api/                        Client-facing routes (search, chart, markets)
├── components/
│   ├── charts/                     Price, portfolio value, allocation, sparkline
│   ├── portfolio/                  Portfolio shell and transaction dialog
│   └── ui/                         Card, stat tile, delta, button, feedback
├── lib/
│   ├── coingecko.ts                Server-side API client with caching
│   ├── portfolio.ts                Cost basis, P/L and history maths
│   ├── supabase/                   Browser, server and session clients
│   ├── format.ts                   Currency, percentage and date formatting
│   └── queries.ts                  Per-user reads
└── proxy.ts                        Session refresh + route protection
```

### Decisions worth explaining

**Transactions are the only stored state.** Holdings, cost basis, allocation and
P/L are all computed from them on read. Nothing can drift out of sync, and
editing a transaction from six months ago recomputes everything correctly.

**Average cost, not FIFO.** Each buy raises the running average cost of the units
held; a sell removes units at that average and banks the difference. Fees are
added to cost on a buy and deducted from proceeds on a sell, so they always
reduce profit. FIFO lot tracking produces different realized numbers and matters
for tax filing — average cost is the right default for a personal tracker
because it needs no lot bookkeeping and is stable under edits.

**CoinGecko is only ever called from the server.** The API key stays out of the
browser, responses are cached per route with `revalidate` windows tuned to how
fast the data actually changes (60s for prices, an hour for multi-year charts),
and rate-limit responses become a rendered message rather than a broken page.

**Mixed currencies are reported, not converted.** Transactions store the currency
they were entered in. Summing across currencies would need historical FX rates,
so the portfolio picks one base currency and tells you plainly that transactions
in others are listed but not included in the totals.

**Row-level security does the access control.** Both tables carry an
`auth.uid() = user_id` policy, so isolation is enforced by Postgres rather than
by remembering to filter in application code. Sessions are read with
`getUser()`, which revalidates the token against Supabase, rather than
`getSession()`, which trusts an attacker-writable cookie.

**Charts follow one visual system.** A validated palette (checked for
colour-vision-deficiency separation and contrast in both themes), 2px lines,
10%-opacity area washes, hairline horizontal gridlines only, a single shared
y-axis, and direction always carried by an arrow and a sign as well as colour.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at <http://localhost:3000> |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

---

## Deploying

Push to GitHub, import the repo at [vercel.com/new](https://vercel.com/new), and
add the same environment variables from `.env.local` in the project settings.
No other configuration is needed.

---

## Notes

Market data is provided by [CoinGecko](https://www.coingecko.com). This is a
personal tracking tool, not financial advice.
