"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aggiornaCorso } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export type Corso = {
  id: string;
  titolo: string;
  descrizione: string | null;
  prezzo: number;
  attivo: boolean;
};

function formattaPrezzo(prezzo: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(prezzo);
}

export function CorsoRiga({ corso }: { corso: Corso }) {
  const [inModifica, setInModifica] = useState(false);
  const [titolo, setTitolo] = useState(corso.titolo);
  const [descrizione, setDescrizione] = useState(corso.descrizione ?? "");
  const [prezzo, setPrezzo] = useState(String(corso.prezzo));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSalva = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await aggiornaCorso(corso.id, {
      titolo,
      descrizione,
      prezzo: Number(prezzo),
    });
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    setInModifica(false);
    router.refresh();
  };

  const handleToggleAttivo = async () => {
    setIsLoading(true);
    await aggiornaCorso(corso.id, { attivo: !corso.attivo });
    setIsLoading(false);
    router.refresh();
  };

  if (inModifica) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} />
        <Textarea value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
        <Input type="number" min="0" step="0.01" value={prezzo} onChange={(e) => setPrezzo(e.target.value)} />
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSalva} disabled={isLoading}>
            Salva
          </Button>
          <Button size="sm" variant="outline" onClick={() => setInModifica(false)} disabled={isLoading}>
            Annulla
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{corso.titolo}</p>
          <Badge variant={corso.attivo ? "default" : "secondary"}>
            {corso.attivo ? "Attivo" : "Disattivato"}
          </Badge>
        </div>
        {corso.descrizione && (
          <p className="text-sm text-muted-foreground mt-1">{corso.descrizione}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">{formattaPrezzo(corso.prezzo)}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setInModifica(true)} disabled={isLoading}>
          Modifica
        </Button>
        <Button size="sm" variant="outline" onClick={handleToggleAttivo} disabled={isLoading}>
          {corso.attivo ? "Disattiva" : "Attiva"}
        </Button>
      </div>
    </div>
  );
}
