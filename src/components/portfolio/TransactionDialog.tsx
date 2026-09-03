"use client";

import { Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { addTransaction, updateTransaction } from "@/app/portfolio/actions";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { Button } from "@/components/ui/Button";
import { currencySymbol, toDatetimeLocalValue } from "@/lib/format";
import { useCoinSearch } from "@/lib/useCoinSearch";
import { CURRENCIES, type Currency, type Transaction } from "@/lib/types";

export interface DialogCoin {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
}

/**
 * Add or edit a transaction.
 *
 * The coin picker is the first field because everything below it is meaningless
 * without one — and picking a coin is what enables the "use live price" helper.
 *
 * The parent mounts this only while the dialog is open, keyed by the
 * transaction being edited, so every open starts from a clean form and no
 * draft leaks between edits.
 */
export function TransactionDialog({
  onClose,
  defaultCurrency,
  prefillCoin,
  editing,
}: {
  onClose: () => void;
  defaultCurrency: Currency;
  prefillCoin?: DialogCoin | null;
  editing?: Transaction | null;
}) {
  const router = useRouter();
  const isEdit = !!editing;

  const [coin, setCoin] = useState<DialogCoin | null>(
    editing
      ? {
          id: editing.coin_id,
          symbol: editing.coin_symbol,
          name: editing.coin_name,
          image: editing.coin_image,
        }
      : (prefillCoin ?? null),
  );
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [type, setType] = useState<"buy" | "sell">(editing?.type ?? "buy");
  const [quantity, setQuantity] = useState(editing ? String(editing.quantity) : "");
  const [price, setPrice] = useState(editing ? String(editing.price_per_coin) : "");
  const [fee, setFee] = useState(editing?.fee ? String(editing.fee) : "");
  const [currency, setCurrency] = useState<Currency>(
    editing?.currency ?? defaultCurrency,
  );
  const [executedAt, setExecutedAt] = useState(() =>
    toDatetimeLocalValue(editing ? new Date(editing.executed_at) : new Date()),
  );
  const [notes, setNotes] = useState(editing?.notes ?? "");

  const [pending, setPending] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { results, loading: searching } = useCoinSearch(query, { enabled: pickerOpen });
  const firstFieldRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fillLivePrice = async () => {
    if (!coin) return;
    setPriceLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/markets?ids=${encodeURIComponent(coin.id)}&currency=${currency}&sparkline=false&perPage=1`,
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not fetch the price.");
      const current = body.coins?.[0]?.current_price;
      if (typeof current !== "number") throw new Error("No price available for this coin.");
      setPrice(String(current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch the price.");
    } finally {
      setPriceLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!coin) {
      setError("Pick a coin first.");
      return;
    }

    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("coin_id", coin.id);
    formData.set("coin_symbol", coin.symbol);
    formData.set("coin_name", coin.name);
    formData.set("coin_image", coin.image ?? "");

    const result = editing
      ? await updateTransaction(editing.id, formData)
      : await addTransaction(formData);

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onClose();
    router.refresh();
  };

  const symbol = currencySymbol(currency);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-8 backdrop-blur-[2px]"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-dialog-title"
        className="w-full max-w-md rounded-xl border border-edge-strong bg-surface shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-edge px-5 py-3.5">
          <h2 id="tx-dialog-title" className="text-sm font-semibold text-ink">
            {isEdit ? "Edit transaction" : "Add transaction"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-5 py-4">
          {/* Coin ------------------------------------------------------- */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-ink-2">Coin</span>

            {pickerOpen ? (
              <div className="rounded-lg border border-edge-strong bg-plane">
                <div className="flex items-center gap-2 border-b border-edge px-3">
                  <Search size={14} className="shrink-0 text-muted" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for a coin…"
                    aria-label="Search for a coin"
                    className="h-9 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                  />
                  {searching ? (
                    <Loader2 size={14} className="shrink-0 animate-spin text-muted" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    className="shrink-0 rounded p-0.5 text-muted hover:text-ink"
                    aria-label="Cancel coin search"
                  >
                    <X size={14} />
                  </button>
                </div>
                <ul className="max-h-44 overflow-y-auto py-1">
                  {query.trim().length < 2 ? (
                    <li className="px-3 py-3 text-center text-xs text-muted">
                      Type at least two characters.
                    </li>
                  ) : results.length === 0 && !searching ? (
                    <li className="px-3 py-3 text-center text-xs text-muted">
                      No matches.
                    </li>
                  ) : (
                    results.map((result) => (
                      <li key={result.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setCoin({
                              id: result.id,
                              symbol: result.symbol,
                              name: result.name,
                              image: result.thumb,
                            });
                            setPickerOpen(false);
                            setQuery("");
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-surface-2"
                        >
                          <CoinIcon src={result.thumb} symbol={result.symbol} size={20} />
                          <span className="min-w-0 flex-1 truncate text-sm text-ink">
                            {result.name}
                          </span>
                          <span className="shrink-0 text-[11px] uppercase text-muted">
                            {result.symbol}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : (
              <button
                ref={firstFieldRef}
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-edge-strong bg-plane px-3 text-left text-sm transition-colors hover:bg-surface-2"
              >
                {coin ? (
                  <>
                    <CoinIcon src={coin.image} symbol={coin.symbol} size={20} />
                    <span className="truncate text-ink">{coin.name}</span>
                    <span className="text-xs uppercase text-muted">{coin.symbol}</span>
                    <span className="ml-auto text-xs text-muted">Change</span>
                  </>
                ) : (
                  <>
                    <Search size={14} className="text-muted" />
                    <span className="text-muted">Search for a coin…</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Type ------------------------------------------------------- */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-ink-2">Type</span>
            <div className="grid grid-cols-2 gap-0.5 rounded-lg border border-edge p-0.5">
              {(["buy", "sell"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={type === value}
                  onClick={() => setType(value)}
                  className={`rounded-md py-1.5 text-xs font-medium capitalize transition-colors ${
                    type === value
                      ? value === "buy"
                        ? "bg-surface-2 text-gain"
                        : "bg-surface-2 text-loss"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <input type="hidden" name="type" value={type} />
          </div>

          {/* Quantity & price ------------------------------------------- */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="quantity" className="block text-xs font-medium text-ink-2">
                Quantity
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                step="any"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.5"
                className="tnum h-10 w-full rounded-lg border border-edge-strong bg-plane px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="price_per_coin"
                  className="block text-xs font-medium text-ink-2"
                >
                  Price per coin
                </label>
                <button
                  type="button"
                  onClick={fillLivePrice}
                  disabled={!coin || priceLoading}
                  className="text-[11px] text-accent underline underline-offset-2 disabled:opacity-40"
                >
                  {priceLoading ? "Loading…" : "Use live"}
                </button>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                  {symbol}
                </span>
                <input
                  id="price_per_coin"
                  name="price_per_coin"
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="tnum h-10 w-full rounded-lg border border-edge-strong bg-plane pl-7 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Fee & currency --------------------------------------------- */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="fee" className="block text-xs font-medium text-ink-2">
                Fee <span className="text-muted">(optional)</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                  {symbol}
                </span>
                <input
                  id="fee"
                  name="fee"
                  type="number"
                  step="any"
                  min="0"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="0.00"
                  className="tnum h-10 w-full rounded-lg border border-edge-strong bg-plane pl-7 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="currency" className="block text-xs font-medium text-ink-2">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="h-10 w-full cursor-pointer rounded-lg border border-edge-strong bg-plane px-3 text-sm text-ink outline-none transition-colors focus:border-accent"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date -------------------------------------------------------- */}
          <div className="space-y-1.5">
            <label htmlFor="executed_at" className="block text-xs font-medium text-ink-2">
              Date &amp; time
            </label>
            <input
              id="executed_at"
              name="executed_at"
              type="datetime-local"
              required
              value={executedAt}
              onChange={(e) => setExecutedAt(e.target.value)}
              className="h-10 w-full rounded-lg border border-edge-strong bg-plane px-3 text-sm text-ink outline-none transition-colors focus:border-accent"
            />
          </div>

          {/* Notes ------------------------------------------------------- */}
          <div className="space-y-1.5">
            <label htmlFor="notes" className="block text-xs font-medium text-ink-2">
              Notes <span className="text-muted">(optional)</span>
            </label>
            <input
              id="notes"
              name="notes"
              type="text"
              maxLength={200}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Exchange, reason, anything"
              className="h-10 w-full rounded-lg border border-edge-strong bg-plane px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
            />
          </div>

          {/* Running total — a sanity check before saving. */}
          {quantity && price ? (
            <p className="tnum rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-2">
              {type === "buy" ? "Total cost" : "Net proceeds"}:{" "}
              <strong className="font-semibold text-ink">
                {symbol}
                {(
                  Number(quantity) * Number(price) +
                  (type === "buy" ? Number(fee || 0) : -Number(fee || 0))
                ).toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </strong>
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-xs text-loss">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? <Loader2 size={14} className="animate-spin" /> : null}
              {isEdit ? "Save changes" : "Add transaction"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
