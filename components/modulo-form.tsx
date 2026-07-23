"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaModulo } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ModuloForm({ corsoId }: { corsoId: string }) {
  const [aperto, setAperto] = useState(false);
  const [titolo, setTitolo] = useState("");
  const [imponibile, setImponibile] = useState("");
  const [scadenzaIscrizione, setScadenzaIscrizione] = useState("");
  const [dataInizio, setDataInizio] = useState("");
  const [postiDisponibili, setPostiDisponibili] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  if (!aperto) {
    return (
      <Button size="sm" variant="outline" onClick={() => setAperto(true)}>
        + Aggiungi modulo
      </Button>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const risultato = await creaModulo(corsoId, {
      titolo,
      imponibile: Number(imponibile),
      scadenza_iscrizione: scadenzaIscrizione,
      data_inizio: dataInizio,
      posti_disponibili: postiDisponibili.trim() === "" ? null : Number(postiDisponibili),
      iscrizioni_chiuse: false,
    });

    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }

    setAperto(false);
    setTitolo("");
    setImponibile("");
    setScadenzaIscrizione("");
    setDataInizio("");
    setPostiDisponibili("");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-dashed border-border p-4 space-y-3">
      <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Titolo modulo" required />
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="Imponibile (€)"
          required
          value={imponibile}
          onChange={(e) => setImponibile(e.target.value)}
        />
        <Input
          type="number"
          min="0"
          step="1"
          placeholder="Posti (vuoto = illimitati)"
          value={postiDisponibili}
          onChange={(e) => setPostiDisponibili(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Scadenza iscrizione</Label>
          <Input
            type="date"
            required
            value={scadenzaIscrizione}
            onChange={(e) => setScadenzaIscrizione(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Data di inizio</Label>
          <Input type="date" required value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? "Creazione…" : "Aggiungi modulo"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setAperto(false)} disabled={isLoading}>
          Annulla
        </Button>
      </div>
    </form>
  );
}
