"use client";

import { useEffect, useState } from "react";

import type { SearchResultCoin } from "./types";

const MIN_QUERY_LENGTH = 2;

/**
 * Debounced coin search against /api/search.
 *
 * Shared by the header's ⌘K dialog and the transaction form's coin picker.
 * In-flight requests are aborted when the query changes, so a slow response for
 * "bit" can never land after the results for "bitcoin".
 */
export function useCoinSearch(query: string, { enabled = true } = {}) {
  const [state, setState] = useState<{
    /** The query these results belong to, so stale state is never shown. */
    query: string;
    results: SearchResultCoin[];
    loading: boolean;
    error: string | null;
  }>({ query: "", results: [], loading: false, error: null });

  const trimmed = query.trim();
  const active = enabled && trimmed.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!active) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setState((prev) => ({ ...prev, query: trimmed, loading: true, error: null }));
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Search failed.");
        setState({
          query: trimmed,
          results: body.coins ?? [],
          loading: false,
          error: null,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({
          query: trimmed,
          results: [],
          loading: false,
          error: err instanceof Error ? err.message : "Search failed.",
        });
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, active]);

  // Results are derived, not reset: when the query is too short or the state
  // still describes an older query, report empty rather than writing state.
  const isCurrent = active && state.query === trimmed;

  return {
    results: isCurrent ? state.results : [],
    loading: active && (!isCurrent || state.loading),
    error: isCurrent ? state.error : null,
  };
}
