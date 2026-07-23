"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aggiornaPacchetto, eliminaPacchetto } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formattaData, formattaPrezzo } from "@/lib/prezzo";
import type { ModuloCorso } from "@/components/modulo-riga";

export type PacchettoCorso = {
  id: string;
  titolo: string;
  imponibile: number;
  scadenza_iscrizione: string;
  posti_disponibili: number | null;
  iscrizioni_chiuse: boolean;
  attivo: boolean;
  moduloIds: string[];
};

export function PacchettoRiga({ pacchetto, moduli }: { pacchetto: PacchettoCorso; moduli: ModuloCorso[] }) {
  const [inModifica, setInModifica] = useState(false);
  const [titolo, setTitolo] = useState(pacchetto.titolo);
  const [imponibile, setImponibile] = useState(String(pacchetto.imponibile));
  const [scadenzaIscrizione, setScadenzaIscrizione] = useState(pacchetto.scadenza_iscrizione);
  const [postiDisponibili, setPostiDisponibili] = useState(
    pacchetto.posti_disponibili === null ? "" : String(pacchetto.posti_disponibili),
  );
  const [iscrizioniChiuse, setIscrizioniChiuse] = useState(pacchetto.iscrizioni_chiuse);
  const [moduloIds, setModuloIds] = useState<string[]>(pacchetto.moduloIds);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const toggleModulo = (id: string) => {
    setModuloIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const handleSalva = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await aggiornaPacchetto(pacchetto.id, {
      titolo,
      imponibile: Number(imponibile),
      scadenza_iscrizione: scadenzaIscrizione,
      posti_disponibili: postiDisponibili.trim() === "" ? null : Number(postiDisponibili),
      iscrizioni_chiuse: iscrizioniChiuse,
      moduloIds,
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
    const risultato = await aggiornaPacchetto(pacchetto.id, { attivo: !pacchetto.attivo });
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  const handleElimina = async () => {
    setIsLoading(true);
    const risultato = await eliminaPacchetto(pacchetto.id);
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  const moduliInclusi = moduli.filter((m) => pacchetto.moduloIds.includes(m.id));

  if (inModifica) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Titolo pacchetto" />
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Imponibile (€)"
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
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={iscrizioniChiuse} onCheckedChange={(v) => setIscrizioniChiuse(v === true)} />
          Chiudi iscrizioni a questo pacchetto
        </label>
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
    <div className="rounded-lg border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-foreground">{pacchetto.titolo}</p>
          <Badge variant={pacchetto.attivo ? "default" : "secondary"}>
            {pacchetto.attivo ? "Attivo" : "Disattivato"}
          </Badge>
          {pacchetto.iscrizioni_chiuse && <Badge variant="destructive">Iscrizioni chiuse</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {formattaPrezzo(pacchetto.imponibile)} + IVA · iscrizioni entro il{" "}
          {formattaData(pacchetto.scadenza_iscrizione)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Include: {moduliInclusi.map((m) => m.titolo).join(", ") || "—"}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setInModifica(true)} disabled={isLoading}>
          Modifica
        </Button>
        <Button size="sm" variant="outline" onClick={handleToggleAttivo} disabled={isLoading}>
          {pacchetto.attivo ? "Disattiva" : "Attiva"}
        </Button>
        <Button size="sm" variant="destructive" onClick={handleElimina} disabled={isLoading}>
          Elimina
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 w-full">
          {error}
        </p>
      )}
    </div>
  );
}
