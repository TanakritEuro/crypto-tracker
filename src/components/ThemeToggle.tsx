"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "ct-theme";
/** Fired on this tab after a change; `storage` only fires on *other* tabs. */
const CHANGE_EVENT = "ct-theme-change";

/**
 * The inline script that runs before first paint. Without it the page renders
 * in the OS theme and then snaps to the stored choice — a visible flash.
 *
 * Kept as a string so it can be injected into the document head, ahead of
 * hydration.
 */
export const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (e) {}
})();
`;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    // Private mode or blocked storage — the OS setting is a fine default.
    return "system";
  }
}

/** The server has no localStorage, so it always renders the "system" state. */
function serverTheme(): Theme {
  return "system";
}

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle() {
  // localStorage is external state; subscribing to it keeps the button in sync
  // across tabs and avoids a mount-time setState that would flash the default.
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);

  const choose = (next: Theme) => {
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);

    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal: the choice still applies to this page view.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="flex items-center gap-0.5 rounded-lg border border-edge bg-surface p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => choose(value)}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              selected ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
            }`}
          >
            <Icon size={14} strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
