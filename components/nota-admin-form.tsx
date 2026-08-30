"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { salvaNotaAdmin } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";

export function NotaAdminForm({ profiloId, notaIniziale }: { profiloId: string; notaIniziale: string }) {
  const [nota, setNota] = useState(notaIniziale);
  const [error, setError] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSalvato(false);
    setIsLoading(true);
    const risultato = await salvaNotaAdmin(profiloId, nota);
    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    setSalvato(true);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <Lock className="size-3.5" />
        Note interne · visibili solo allo staff
      </div>
      <textarea
        value={nota}
        onChange={(e) => {
          setSalvato(false);
          setNota(e.target.value);
        }}
        rows={4}
        placeholder="Nota interna, visibile solo agli admin — mai al corsista."
        className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {salvato && <p className="text-sm text-emerald-700">Nota salvata ✓</p>}
      <Button type="submit" size="sm" variant="outline" disabled={isLoading} className="w-fit">
        {isLoading ? "Salvataggio…" : "Salva nota"}
      </Button>
    </form>
  );
}
