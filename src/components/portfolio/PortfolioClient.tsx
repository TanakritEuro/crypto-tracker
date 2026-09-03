"use client";

import { Loader2, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteTransaction } from "@/app/portfolio/actions";
import { AllocationChart } from "@/components/charts/AllocationChart";
import { PortfolioValueChart } from "@/components/charts/PortfolioValueChart";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { Delta, DeltaMoney } from "@/components/ui/Delta";
import { EmptyState } from "@/components/ui/Feedback";
import { HeroFigure, StatTile } from "@/components/ui/StatTile";
import {
  formatDateTime,
  formatMoney,
  formatPercent,
  formatPrice,
  formatQuantity,
} from "@/lib/format";
import type { HistoryPoint } from "@/lib/portfolio";
import type { Currency, PortfolioSummary, Transaction } from "@/lib/types";

import { TransactionDialog, type DialogCoin } from "./TransactionDialog";

const RANGES = [
  { days: 7, label: "7D" },
  { days: 30, label: "1M" },
  { days: 90, label: "3M" },
  { days: 365, label: "1Y" },
];

export function PortfolioClient({
  summary,
  transactions,
  currency,
  history,
  days,
  prefillCoin,
  openOnLoad,
  mixedCurrencies,
}: {
  summary: PortfolioSummary;
  transactions: Transaction[];
  currency: Currency;
  history: HistoryPoint[];
  days: number;
  prefillCoin: DialogCoin | null;
  openOnLoad: boolean;
  mixedCurrencies: Currency[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dialogOpen, setDialogOpen] = useState(openOnLoad);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (transaction: Transaction) => {
    setEditing(transaction);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    // Drop ?coin= so a refresh doesn't reopen the prefilled dialog.
    if (searchParams.get("coin")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("coin");
      router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
    }
  };

  const setRange = (nextDays: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", String(nextDays));
    router.push(`${pathname}?${params}`, { scroll: false });
  };

  const confirmDelete = (id: string) => {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteTransaction(id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      setConfirmingDelete(null);
      router.refresh();
    });
  };

  const hasTransactions = transactions.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-medium text-muted">Portfolio</h1>
          <div className="mt-1">
            <HeroFigure
              label={`Total value · ${currency.toUpperCase()}`}
              value={formatMoney(summary.totalValue, currency)}
              delta={
                hasTransactions ? (
                  <>
                    <DeltaMoney value={summary.change24hValue} currency={currency} />
                    <Delta value={summary.change24hPercent} />
                    <span className="text-xs text-muted">past 24 hours</span>
                  </>
                ) : null
              }
            />
          </div>
        </div>

        <Button variant="primary" onClick={openAdd}>
          <Plus size={15} strokeWidth={2.5} />
          Add transaction
        </Button>
      </header>

      {mixedCurrencies.length > 0 ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-edge bg-surface px-4 py-3 text-xs leading-relaxed text-ink-2"
        >
          <TriangleAlert size={15} className="mt-px shrink-0 text-[var(--series-4)]" />
          <p>
            Totals below cover your{" "}
            <strong className="font-semibold text-ink">{currency.toUpperCase()}</strong>{" "}
            transactions only. You also have transactions in{" "}
            {mixedCurrencies.map((c) => c.toUpperCase()).join(", ")} — converting them
            would need historical exchange rates, so they are listed but not summed.
          </p>
        </div>
      ) : null}

      {!hasTransactions ? (
        <Card>
          <EmptyState
            title="No transactions yet"
            description="Record a buy to start tracking cost basis, profit and loss, and how your allocation shifts over time."
            action={
              <Button variant="primary" onClick={openAdd}>
                <Plus size={15} strokeWidth={2.5} />
                Add your first transaction
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <section aria-label="Portfolio summary">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                label="Cost basis"
                value={formatMoney(summary.totalCostBasis, currency)}
                hint="of open positions"
              />
              <StatTile
                label="Unrealized P/L"
                value={
                  <span
                    className={
                      summary.unrealizedPnl > 0
                        ? "text-gain"
                        : summary.unrealizedPnl < 0
                          ? "text-loss"
                          : undefined
                    }
                  >
                    {formatMoney(summary.unrealizedPnl, currency)}
                  </span>
                }
                delta={<Delta value={summary.unrealizedPnlPercent} />}
                hint="vs cost"
              />
              <StatTile
                label="Realized P/L"
                value={
                  <span
                    className={
                      summary.realizedPnl > 0
                        ? "text-gain"
                        : summary.realizedPnl < 0
                          ? "text-loss"
                          : undefined
                    }
                  >
                    {formatMoney(summary.realizedPnl, currency)}
                  </span>
                }
                hint="banked by sells"
              />
              <StatTile
                label="Positions"
                value={summary.holdings.length}
                hint={`${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`}
              />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader
                title="Value over time"
                subtitle="Market value against the cash you have put in"
                action={
                  <div
                    role="tablist"
                    aria-label="History range"
                    className="flex items-center gap-0.5 rounded-lg border border-edge p-0.5"
                  >
                    {RANGES.map((range) => (
                      <button
                        key={range.days}
                        type="button"
                        role="tab"
                        aria-selected={days === range.days}
                        onClick={() => setRange(range.days)}
                        className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                          days === range.days
                            ? "bg-surface-2 text-ink"
                            : "text-muted hover:text-ink"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                }
              />
              <div className="py-4">
                <PortfolioValueChart
                  points={history}
                  currency={currency}
                  days={days}
                />
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader
                title="Allocation"
                subtitle={`${summary.holdings.length} open ${summary.holdings.length === 1 ? "position" : "positions"}`}
              />
              <AllocationChart
                holdings={summary.holdings}
                currency={currency}
                totalValue={summary.totalValue}
              />
            </Card>
          </div>

          {/* Holdings ------------------------------------------------- */}
          <Card>
            <CardHeader title="Holdings" subtitle="Open positions, valued live" />
            {summary.holdings.length === 0 ? (
              <EmptyState
                title="No open positions"
                description="Everything you have bought has been sold. Realized P/L is still counted above."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-edge text-xs text-muted">
                      <th scope="col" className="py-2.5 pl-4 pr-3 text-left font-medium sm:pl-5">
                        Coin
                      </th>
                      <th scope="col" className="py-2.5 pr-3 text-right font-medium">
                        Quantity
                      </th>
                      <th scope="col" className="py-2.5 pr-3 text-right font-medium">
                        Avg cost
                      </th>
                      <th scope="col" className="py-2.5 pr-3 text-right font-medium">
                        Price
                      </th>
                      <th scope="col" className="hidden py-2.5 pr-3 text-right font-medium sm:table-cell">
                        24h
                      </th>
                      <th scope="col" className="py-2.5 pr-3 text-right font-medium">
                        Value
                      </th>
                      <th scope="col" className="py-2.5 pr-4 text-right font-medium sm:pr-5">
                        Profit / loss
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.holdings.map((holding) => (
                      <tr
                        key={holding.coinId}
                        className="group border-b border-edge last:border-0 transition-colors hover:bg-surface-2"
                      >
                        <td className="py-3 pl-4 pr-3 sm:pl-5">
                          <Link
                            href={`/coins/${holding.coinId}`}
                            className="flex items-center gap-2.5"
                          >
                            <CoinIcon
                              src={holding.image}
                              symbol={holding.symbol}
                              size={24}
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-ink group-hover:underline">
                                {holding.name}
                              </span>
                              <span className="tnum block text-xs text-muted">
                                {formatPercent(holding.allocation, 1).replace("+", "")} of
                                portfolio
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="tnum py-3 pr-3 text-right text-ink-2">
                          {formatQuantity(holding.quantity)}
                          <span className="ml-1 text-xs uppercase text-muted">
                            {holding.symbol}
                          </span>
                        </td>
                        <td className="tnum py-3 pr-3 text-right text-ink-2">
                          {formatPrice(holding.avgCost, currency)}
                        </td>
                        <td className="tnum py-3 pr-3 text-right font-medium text-ink">
                          {formatPrice(holding.price, currency)}
                        </td>
                        <td className="hidden py-3 pr-3 text-right sm:table-cell">
                          <Delta value={holding.change24h} />
                        </td>
                        <td className="tnum py-3 pr-3 text-right font-medium text-ink">
                          {formatMoney(holding.value, currency)}
                        </td>
                        <td className="py-3 pr-4 text-right sm:pr-5">
                          <DeltaMoney
                            value={holding.unrealizedPnl}
                            currency={currency}
                            className="block font-medium"
                          />
                          <Delta
                            value={holding.unrealizedPnlPercent}
                            className="text-xs"
                            showArrow={false}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Closed positions ----------------------------------------- */}
          {summary.closedHoldings.length > 0 ? (
            <Card>
              <CardHeader
                title="Closed positions"
                subtitle="Fully sold — realized profit and loss only"
              />
              <ul className="divide-y divide-[var(--border)]">
                {summary.closedHoldings.map((holding) => (
                  <li
                    key={holding.coinId}
                    className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
                  >
                    <CoinIcon src={holding.image} symbol={holding.symbol} size={20} />
                    <Link
                      href={`/coins/${holding.coinId}`}
                      className="min-w-0 flex-1 truncate text-sm text-ink hover:underline"
                    >
                      {holding.name}
                    </Link>
                    <span className="text-xs text-muted">
                      {holding.transactionCount} transactions
                    </span>
                    <DeltaMoney
                      value={holding.realizedPnl}
                      currency={currency}
                      className="w-28 text-right text-sm font-medium"
                    />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}

      {/* Transactions ----------------------------------------------- */}
      {hasTransactions ? (
        <Card>
          <CardHeader
            title="Transactions"
            subtitle="Everything the numbers above are derived from"
            action={
              <Button size="sm" onClick={openAdd}>
                <Plus size={13} strokeWidth={2.5} />
                Add
              </Button>
            }
          />

          {deleteError ? (
            <p role="alert" className="border-b border-edge px-4 py-2 text-xs text-loss sm:px-5">
              {deleteError}
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-edge text-xs text-muted">
                  <th scope="col" className="py-2.5 pl-4 pr-3 text-left font-medium sm:pl-5">
                    Coin
                  </th>
                  <th scope="col" className="py-2.5 pr-3 text-left font-medium">
                    Type
                  </th>
                  <th scope="col" className="py-2.5 pr-3 text-right font-medium">
                    Quantity
                  </th>
                  <th scope="col" className="py-2.5 pr-3 text-right font-medium">
                    Price
                  </th>
                  <th scope="col" className="py-2.5 pr-3 text-right font-medium">
                    Total
                  </th>
                  <th scope="col" className="hidden py-2.5 pr-3 text-left font-medium md:table-cell">
                    Date
                  </th>
                  <th scope="col" className="py-2.5 pr-4 text-right font-medium sm:pr-5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const total =
                    transaction.quantity * transaction.price_per_coin +
                    (transaction.type === "buy" ? transaction.fee : -transaction.fee);
                  const isConfirming = confirmingDelete === transaction.id;

                  return (
                    <tr
                      key={transaction.id}
                      className="border-b border-edge last:border-0 transition-colors hover:bg-surface-2"
                    >
                      <td className="py-2.5 pl-4 pr-3 sm:pl-5">
                        <Link
                          href={`/coins/${transaction.coin_id}`}
                          className="flex items-center gap-2.5 hover:underline"
                        >
                          <CoinIcon
                            src={transaction.coin_image}
                            symbol={transaction.coin_symbol}
                            size={20}
                          />
                          <span className="truncate text-ink">
                            {transaction.coin_name}
                          </span>
                        </Link>
                        {transaction.notes ? (
                          <p className="mt-0.5 truncate pl-[30px] text-xs text-muted">
                            {transaction.notes}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border border-edge px-1.5 py-0.5 text-xs font-medium capitalize ${
                            transaction.type === "buy" ? "text-gain" : "text-loss"
                          }`}
                        >
                          <span aria-hidden className="text-[0.65em]">
                            {transaction.type === "buy" ? "▲" : "▼"}
                          </span>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="tnum py-2.5 pr-3 text-right text-ink-2">
                        {formatQuantity(transaction.quantity)}
                      </td>
                      <td className="tnum py-2.5 pr-3 text-right text-ink-2">
                        {formatPrice(transaction.price_per_coin, transaction.currency)}
                      </td>
                      <td className="tnum py-2.5 pr-3 text-right font-medium text-ink">
                        {formatMoney(total, transaction.currency)}
                        {transaction.fee ? (
                          <span className="block text-[11px] font-normal text-muted">
                            incl. {formatMoney(transaction.fee, transaction.currency)} fee
                          </span>
                        ) : null}
                      </td>
                      <td className="hidden py-2.5 pr-3 text-xs text-muted md:table-cell">
                        {formatDateTime(transaction.executed_at)}
                      </td>
                      <td className="py-2.5 pr-4 text-right sm:pr-5">
                        {isConfirming ? (
                          <span className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => confirmDelete(transaction.id)}
                              disabled={pending}
                              className="inline-flex items-center gap-1 rounded-md border border-edge-strong px-2 py-1 text-xs font-medium text-loss transition-colors hover:bg-surface disabled:opacity-50"
                            >
                              {pending ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : null}
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingDelete(null)}
                              className="rounded-md px-2 py-1 text-xs text-muted hover:text-ink"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => openEdit(transaction)}
                              aria-label={`Edit ${transaction.coin_name} transaction`}
                              className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-ink"
                            >
                              <Pencil size={13} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setConfirmingDelete(transaction.id);
                              }}
                              aria-label={`Delete ${transaction.coin_name} transaction`}
                              className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-loss"
                            >
                              <Trash2 size={13} strokeWidth={2} />
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {dialogOpen ? (
        <TransactionDialog
          // A fresh instance per add/edit — the form initializes from these
          // props, so remounting is what resets it.
          key={editing?.id ?? "new"}
          onClose={closeDialog}
          defaultCurrency={currency}
          prefillCoin={prefillCoin}
          editing={editing}
        />
      ) : null}
    </div>
  );
}
