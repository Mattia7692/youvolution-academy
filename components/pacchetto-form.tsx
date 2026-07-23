"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaPacchetto } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { ModuloCorso } from "@/components/modulo-riga";

export function PacchettoForm({ corsoId, moduli }: { corsoId: string; moduli: ModuloCorso[] }) {
  const [aperto, setAperto] = useState(false);
  const [titolo, setTitolo] = useState("Tutti i moduli");
  const [imponibile, setImponibile] = useState("");
  const [scadenzaIscrizione, setScadenzaIscrizione] = useState("");
  const [postiDisponibili, setPostiDisponibili] = useState("");
  const [moduloIds, setModuloIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  if (moduli.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Servono almeno due moduli attivi per poter creare un pacchetto.
      </p>
    );
  }

  if (!aperto) {
    return (
      <Button size="sm" variant="outline" onClick={() => setAperto(true)}>
        + Aggiungi pacchetto
      </Button>
    );
  }

  const toggleModulo = (id: string) => {
    setModuloIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const risultato = await creaPacchetto(corsoId, {
      titolo,
      imponibile: Number(imponibile),
      scadenza_iscrizione: scadenzaIscrizione,
      posti_disponibili: postiDisponibili.trim() === "" ? null : Number(postiDisponibili),
      iscrizioni_chiuse: false,
      moduloIds,
    });

    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }

    setAperto(false);
    setTitolo("Tutti i moduli");
    setImponibile("");
    setScadenzaIscrizione("");
    setPostiDisponibili("");
    setModuloIds([]);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-dashed border-border p-4 space-y-3">
      <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Titolo pacchetto" required />
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
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Scadenza iscrizione</Label>
        <Input
          type="date"
          required
          value={scadenzaIscrizione}
          onChange={(e) => setScadenzaIscrizione(e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Moduli inclusi</Label>
        <div className="flex flex-col gap-1.5 mt-1">
          {moduli.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={moduloIds.includes(m.id)} onCheckedChange={() => toggleModulo(m.id)} />
              {m.titolo}
            </label>
          ))}
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? "Creazione…" : "Aggiungi pacchetto"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setAperto(false)} disabled={isLoading}>
          Annulla
        </Button>
      </div>
    </form>
  );
}
