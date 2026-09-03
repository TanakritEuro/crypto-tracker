import { AuthForm } from "@/components/AuthForm";
import { SupabaseSetupNotice } from "@/components/SupabaseSetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = {
  title: "Sign in",
  description: "Sign in to track your crypto portfolio and watchlist.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Only allow same-site paths back — an absolute URL here would be an open
  // redirect.
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/portfolio";

  if (!isSupabaseConfigured) {
    return (
      <div className="py-8">
        <SupabaseSetupNotice />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Sign in to Ledger
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Your portfolio and watchlist are private to your account.
        </p>
      </header>

      <div className="rounded-xl border border-edge bg-surface px-5 py-5">
        <AuthForm next={destination} />
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-muted">
        Browsing prices and charts needs no account.
      </p>
    </div>
  );
}
