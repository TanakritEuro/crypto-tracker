"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function AuthForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // With email confirmation enabled, sign-up returns a user but no
        // session — say so rather than redirecting to a page that bounces back.
        if (!data.session) {
          setNotice("Check your inbox to confirm your email, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      // Refresh so the server components pick up the new session cookie.
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div
        role="tablist"
        aria-label="Account action"
        className="grid grid-cols-2 gap-0.5 rounded-lg border border-edge p-0.5"
      >
        {(["signin", "signup"] as Mode[]).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => {
              setMode(value);
              setError(null);
              setNotice(null);
            }}
            className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
              mode === value ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {value === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-medium text-ink-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="h-10 w-full rounded-lg border border-edge-strong bg-plane px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-medium text-ink-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="At least 6 characters"
          className="h-10 w-full rounded-lg border border-edge-strong bg-plane px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
        />
      </div>

      {error ? (
        <p role="alert" className="text-xs text-loss">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-xs text-gain">
          {notice}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {pending ? <Loader2 size={15} className="animate-spin" /> : null}
        {mode === "signin" ? "Sign in" : "Create account"}
      </Button>
    </form>
  );
}
