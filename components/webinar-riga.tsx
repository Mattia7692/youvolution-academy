"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aggiornaWebinar, eliminaWebinar } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formattaDataOra, formattaOra } from "@/lib/prezzo";

export type WebinarModulo = {
  id: string;
  titolo: string;
  inizio: string;
  fine: string;
};

// <input type="datetime-local"> vuole "yyyy-MM-ddTHH:mm" in ora locale, non
// l'ISO con offset che arriva dal DB.
function perInputLocale(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function WebinarRiga({ webinar }: { webinar: WebinarModulo }) {
  const [inModifica, setInModifica] = useState(false);
  const [titolo, setTitolo] = useState(webinar.titolo);
  const [inizio, setInizio] = useState(perInputLocale(webinar.inizio));
  const [fine, setFine] = useState(perInputLocale(webinar.fine));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSalva = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await aggiornaWebinar(webinar.id, {
      titolo,
      inizio: new Date(inizio).toISOString(),
      fine: new Date(fine).toISOString(),
    });
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    setInModifica(false);
    router.refresh();
  };

  const handleElimina = async () => {
    setIsLoading(true);
    const risultato = await eliminaWebinar(webinar.id);
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  if (inModifica) {
    return (
      <div className="rounded-md border border-dashed border-border p-2 space-y-2">
        <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Titolo webinar" />
        <div className="grid grid-cols-2 gap-2">
          <Input type="datetime-local" value={inizio} onChange={(e) => setInizio(e.target.value)} />
          <Input type="datetime-local" value={fine} onChange={(e) => setFine(e.target.value)} />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" size="xs" onClick={handleSalva} disabled={isLoading}>
            Salva
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => setInModifica(false)}
            disabled={isLoading}
          >
            Annulla
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">
        {webinar.titolo} — {formattaDataOra(webinar.inizio)}–{formattaOra(webinar.fine)}
      </span>
      <div className="flex gap-1 shrink-0">
        <Button type="button" size="xs" variant="outline" onClick={() => setInModifica(true)}>
          Modifica
        </Button>
        <Button type="button" size="xs" variant="destructive" onClick={handleElimina} disabled={isLoading}>
          Elimina
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
