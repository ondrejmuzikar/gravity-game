import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm">
        <p className="font-mono text-[11px] tracking-[0.22em] text-muted uppercase">Gravity Switch</p>
        <h1 className="font-display mt-3 text-3xl tracking-tight">Přihlášení</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Účet je volitelný. Rekordy drží tenhle prohlížeč i bez něj.
        </p>
        <div className="mt-6 space-y-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                Pokračovat přes {p.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted">Přihlášení je vypnuté.</p>
          )}
        </div>
        <Link
          to="/"
          className="mt-6 inline-block text-sm text-muted transition-colors hover:text-fg"
        >
          Zpět ke kouli
        </Link>
      </div>
    </main>
  );
}
