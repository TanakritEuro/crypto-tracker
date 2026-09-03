"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCoinSearch } from "@/lib/useCoinSearch";

import { CoinIcon } from "./ui/CoinIcon";

/** ⌘K / Ctrl-K coin search. Navigates to the selected coin's detail page. */
export function SearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { results, loading, error } = useCoinSearch(query, { enabled: open });

  // Clamp rather than reset via an effect: the result list can shrink under a
  // stale index while a new query's results are still arriving.
  const active = results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  // Global shortcut.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the highlighted row inside the scroll viewport.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const select = (id: string) => {
    close();
    router.push(`/coins/${id}`);
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(Math.min(active + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(Math.max(active - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      select(results[active].id);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-2 rounded-lg border border-edge bg-surface px-2.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-ink-2"
      >
        <Search size={14} strokeWidth={2} />
        <span className="hidden sm:inline">Search coins</span>
        <kbd className="ml-2 hidden rounded border border-edge px-1 py-px font-sans text-[10px] text-muted sm:inline">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-[2px]"
          onMouseDown={close}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search coins"
            className="w-full max-w-lg overflow-hidden rounded-xl border border-edge-strong bg-surface shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 border-b border-edge px-4">
              <Search size={16} strokeWidth={2} className="shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onInputKeyDown}
                placeholder="Bitcoin, SOL, pepe…"
                aria-label="Search coins"
                className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
              {loading ? (
                <Loader2 size={15} className="shrink-0 animate-spin text-muted" />
              ) : null}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {error ? (
                <p className="px-4 py-6 text-center text-xs text-loss">{error}</p>
              ) : query.trim().length < 2 ? (
                <p className="px-4 py-6 text-center text-xs text-muted">
                  Type at least two characters.
                </p>
              ) : results.length === 0 && !loading ? (
                <p className="px-4 py-6 text-center text-xs text-muted">
                  No coins match “{query.trim()}”.
                </p>
              ) : (
                <ul ref={listRef} className="py-1">
                  {results.map((coin, i) => (
                    <li key={coin.id} data-index={i}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => select(coin.id)}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                          i === active ? "bg-surface-2" : ""
                        }`}
                      >
                        <CoinIcon src={coin.thumb} symbol={coin.symbol} size={22} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink">
                            {coin.name}
                          </span>
                          <span className="block text-[11px] uppercase text-muted">
                            {coin.symbol}
                          </span>
                        </span>
                        {coin.marketCapRank ? (
                          <span className="tnum shrink-0 text-[11px] text-muted">
                            #{coin.marketCapRank}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
