-- =============================================================================
-- Ledger — database schema
--
-- Run this once in your Supabase project: SQL Editor -> New query -> paste ->
-- Run. It is idempotent, so re-running it after a change is safe.
--
-- Every table is protected by row-level security: a policy checks
-- `auth.uid() = user_id` on read and write, so one signed-in user can never see
-- or modify another's rows even though they share a table and an API key.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- transactions — the source of truth for the portfolio
--
-- Holdings, cost basis and P/L are all *derived* from this table rather than
-- stored. That keeps the numbers consistent by construction: editing a
-- transaction recomputes everything, with no cached balance to fall out of sync.
-- -----------------------------------------------------------------------------
create table if not exists public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,

  -- CoinGecko coin id (e.g. 'bitcoin'), plus a metadata snapshot so the
  -- transaction list still renders when a price lookup fails.
  coin_id        text not null,
  coin_symbol    text not null,
  coin_name      text not null,
  coin_image     text,

  type           text not null check (type in ('buy', 'sell')),
  quantity       numeric not null check (quantity > 0),
  price_per_coin numeric not null check (price_per_coin >= 0),
  fee            numeric not null default 0 check (fee >= 0),

  -- The currency the amounts above are denominated in.
  currency       text not null default 'usd'
                   check (currency in ('usd', 'eur', 'gbp', 'jpy', 'thb')),

  executed_at    timestamptz not null default now(),
  notes          text,
  created_at     timestamptz not null default now()
);

-- The portfolio always reads one user's transactions in chronological order.
create index if not exists transactions_user_executed_idx
  on public.transactions (user_id, executed_at desc);

create index if not exists transactions_user_coin_idx
  on public.transactions (user_id, coin_id);

-- -----------------------------------------------------------------------------
-- watchlist — coins followed without holding them
-- -----------------------------------------------------------------------------
create table if not exists public.watchlist (
  user_id     uuid not null references auth.users (id) on delete cascade,
  coin_id     text not null,
  coin_symbol text not null,
  coin_name   text not null,
  coin_image  text,
  created_at  timestamptz not null default now(),
  primary key (user_id, coin_id)
);

-- =============================================================================
-- Row-level security
-- =============================================================================

alter table public.transactions enable row level security;
alter table public.watchlist    enable row level security;

-- Policies are dropped first so this file can be re-run after edits.
drop policy if exists "transactions are private to their owner" on public.transactions;
create policy "transactions are private to their owner"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "watchlist is private to its owner" on public.watchlist;
create policy "watchlist is private to its owner"
  on public.watchlist
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
