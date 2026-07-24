"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaWebinar } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WebinarForm({ moduloId }: { moduloId: string }) {
  const [aperto, setAperto] = useState(false);
  const [titolo, setTitolo] = useState("");
  const [inizio, setInizio] = useState("");
  const [fine, setFine] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  if (!aperto) {
    return (
      <Button type="button" size="xs" variant="outline" onClick={() => setAperto(true)}>
        + Aggiungi webinar
      </Button>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // <input type="datetime-local"> restituisce un orario "ingenuo" senza
    // fuso: new Date(...) lo interpreta nel fuso del browser (Italia), da
    // cui ricaviamo l'ISO UTC corretto da salvare in una colonna timestamptz.
    const risultato = await creaWebinar(moduloId, {
      titolo,
      inizio: new Date(inizio).toISOString(),
      fine: new Date(fine).toISOString(),
    });

    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }

    setAperto(false);
    setTitolo("");
    setInizio("");
    setFine("");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-dashed border-border p-2 space-y-2">
      <Input
        value={titolo}
        onChange={(e) => setTitolo(e.target.value)}
        placeholder="Es. Primo webinar modulo 2"
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <Input type="datetime-local" required value={inizio} onChange={(e) => setInizio(e.target.value)} />
        <Input type="datetime-local" required value={fine} onChange={(e) => setFine(e.target.value)} />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="xs" disabled={isLoading}>
          {isLoading ? "Creazione…" : "Aggiungi webinar"}
        </Button>
        <Button type="button" size="xs" variant="outline" onClick={() => setAperto(false)} disabled={isLoading}>
          Annulla
        </Button>
      </div>
    </form>
  );
}
