import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-void" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-lg font-semibold tracking-tight">Něco se pokazilo</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {error.message || "Neočekávaná chyba. Zkuste stránku znovu načíst."}
      </p>
    </main>
  );
}
