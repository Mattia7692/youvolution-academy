"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aggiornaModulo, eliminaModulo } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formattaData, formattaPrezzo } from "@/lib/prezzo";

export type ModuloCorso = {
  id: string;
  titolo: string;
  imponibile: number;
  scadenza_iscrizione: string;
  data_inizio: string;
  posti_disponibili: number | null;
  iscrizioni_chiuse: boolean;
  attivo: boolean;
};

export function ModuloRiga({ modulo }: { modulo: ModuloCorso }) {
  const [inModifica, setInModifica] = useState(false);
  const [titolo, setTitolo] = useState(modulo.titolo);
  const [imponibile, setImponibile] = useState(String(modulo.imponibile));
  const [scadenzaIscrizione, setScadenzaIscrizione] = useState(modulo.scadenza_iscrizione);
  const [dataInizio, setDataInizio] = useState(modulo.data_inizio);
  const [postiDisponibili, setPostiDisponibili] = useState(
    modulo.posti_disponibili === null ? "" : String(modulo.posti_disponibili),
  );
  const [iscrizioniChiuse, setIscrizioniChiuse] = useState(modulo.iscrizioni_chiuse);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSalva = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await aggiornaModulo(modulo.id, {
      titolo,
      imponibile: Number(imponibile),
      scadenza_iscrizione: scadenzaIscrizione,
      data_inizio: dataInizio,
      posti_disponibili: postiDisponibili.trim() === "" ? null : Number(postiDisponibili),
      iscrizioni_chiuse: iscrizioniChiuse,
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
    const risultato = await aggiornaModulo(modulo.id, { attivo: !modulo.attivo });
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  const handleElimina = async () => {
    setIsLoading(true);
    const risultato = await eliminaModulo(modulo.id);
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  if (inModifica) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Titolo modulo" />
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
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Scadenza iscrizione</Label>
            <Input
              type="date"
              value={scadenzaIscrizione}
              onChange={(e) => setScadenzaIscrizione(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Data di inizio</Label>
            <Input type="date" value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={iscrizioniChiuse} onCheckedChange={(v) => setIscrizioniChiuse(v === true)} />
          Chiudi iscrizioni a questo modulo
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
          <p className="font-medium text-foreground">{modulo.titolo}</p>
          <Badge variant={modulo.attivo ? "default" : "secondary"}>
            {modulo.attivo ? "Attivo" : "Disattivato"}
          </Badge>
          {modulo.iscrizioni_chiuse && <Badge variant="destructive">Iscrizioni chiuse</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {formattaPrezzo(modulo.imponibile)} + IVA · inizia il {formattaData(modulo.data_inizio)} · iscrizioni
          entro il {formattaData(modulo.scadenza_iscrizione)}
          {modulo.posti_disponibili !== null && ` · ${modulo.posti_disponibili} posti`}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setInModifica(true)} disabled={isLoading}>
          Modifica
        </Button>
        <Button size="sm" variant="outline" onClick={handleToggleAttivo} disabled={isLoading}>
          {modulo.attivo ? "Disattiva" : "Attiva"}
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
