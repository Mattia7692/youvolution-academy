"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { aggiornaCorso, duplicaCorso, eliminaCorso } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formattaData, formattaPrezzo } from "@/lib/prezzo";
import { METODI_PAGAMENTO, type MetodoPagamento } from "@/lib/pagamento";
import type { ModuloCorso } from "@/components/modulo-riga";
import type { PacchettoCorso } from "@/components/pacchetto-riga";

export type Corso = {
  id: string;
  titolo: string;
  descrizione: string | null;
  calendario: string | null;
  metodo_pagamento: MetodoPagamento;
  attivo: boolean;
  sold_out_manuale: boolean;
  iscrizioni_chiuse_manuale: boolean;
  early_bird_scadenza: string | null;
  early_bird_percentuale: number | null;
};

function riepilogoPrezzo(moduli: ModuloCorso[], pacchetti: PacchettoCorso[]) {
  const moduliAttivi = moduli.filter((m) => m.attivo);
  if (moduliAttivi.length === 0 && pacchetti.filter((p) => p.attivo).length === 0) {
    return "Nessun modulo configurato";
  }
  if (moduliAttivi.length === 1 && pacchetti.length === 0) {
    return `${formattaPrezzo(moduliAttivi[0].imponibile)} + IVA`;
  }
  const prezzi = moduliAttivi.map((m) => m.imponibile);
  const min = prezzi.length ? Math.min(...prezzi) : null;
  return `${moduliAttivi.length} moduli${pacchetti.length ? ` · ${pacchetti.length} pacchetto/i` : ""}${
    min !== null ? ` · da ${formattaPrezzo(min)} + IVA` : ""
  }`;
}

export function CorsoRiga({
  corso,
  moduli,
  pacchetti,
  iscritti,
}: {
  corso: Corso;
  moduli: ModuloCorso[];
  pacchetti: PacchettoCorso[];
  iscritti: number;
}) {
  const [inModifica, setInModifica] = useState(false);
  const [titolo, setTitolo] = useState(corso.titolo);
  const [descrizione, setDescrizione] = useState(corso.descrizione ?? "");
  const [calendario, setCalendario] = useState(corso.calendario ?? "");
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>(corso.metodo_pagamento);
  const [earlyBirdAttivo, setEarlyBirdAttivo] = useState(corso.early_bird_scadenza !== null);
  const [earlyBirdScadenza, setEarlyBirdScadenza] = useState(corso.early_bird_scadenza ?? "");
  const [earlyBirdPercentuale, setEarlyBirdPercentuale] = useState(
    corso.early_bird_percentuale === null ? "" : String(corso.early_bird_percentuale),
  );
  const [confermaEliminazione, setConfermaEliminazione] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const nienteAcquistabile =
    moduli.filter((m) => m.attivo).length === 0 && pacchetti.filter((p) => p.attivo).length === 0;

  const handleElimina = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await eliminaCorso(corso.id);
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      setConfermaEliminazione(false);
      return;
    }
    router.refresh();
  };

  const handleSalva = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await aggiornaCorso(corso.id, {
      titolo,
      descrizione,
      calendario,
      metodo_pagamento: metodoPagamento,
      early_bird_scadenza: earlyBirdAttivo ? earlyBirdScadenza : null,
      early_bird_percentuale: earlyBirdAttivo ? Number(earlyBirdPercentuale) : null,
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
    setError(null);
    setIsLoading(true);
    const risultato = await aggiornaCorso(corso.id, { attivo: !corso.attivo });
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  const handleToggleSoldOut = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await aggiornaCorso(corso.id, { sold_out_manuale: !corso.sold_out_manuale });
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  const handleToggleIscrizioniChiuse = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await aggiornaCorso(corso.id, {
      iscrizioni_chiuse_manuale: !corso.iscrizioni_chiuse_manuale,
    });
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  const handleDuplica = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await duplicaCorso(corso.id);
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.push(`/admin/corsi/${risultato.corsoId}/date`);
  };

  if (inModifica) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Titolo" />
        <Textarea
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          placeholder="Descrizione"
        />
        <Textarea
          value={calendario}
          onChange={(e) => setCalendario(e.target.value)}
          placeholder="Calendario / date (facoltativo)"
        />
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Metodo di pagamento</Label>
          <RadioGroup
            value={metodoPagamento}
            onValueChange={(v) => setMetodoPagamento(v as MetodoPagamento)}
            className="flex flex-wrap gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="allianz" id={`pagamento-allianz-${corso.id}`} />
              <Label htmlFor={`pagamento-allianz-${corso.id}`} className="font-normal">
                Allianz Bank
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="fineco" id={`pagamento-fineco-${corso.id}`} />
              <Label htmlFor={`pagamento-fineco-${corso.id}`} className="font-normal">
                Fineco Bank
              </Label>
            </div>
          </RadioGroup>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={earlyBirdAttivo} onCheckedChange={(v) => setEarlyBirdAttivo(v === true)} />
            Offri uno sconto early bird per questo corso
          </label>
          {earlyBirdAttivo && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Scade il</Label>
                <Input
                  type="date"
                  value={earlyBirdScadenza}
                  onChange={(e) => setEarlyBirdScadenza(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Sconto %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={earlyBirdPercentuale}
                  onChange={(e) => setEarlyBirdPercentuale(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
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

  const bottoneClasse = "w-full h-auto min-h-9 py-1.5 whitespace-normal text-xs leading-tight text-center";

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/admin/corsi/${corso.id}`} className="font-medium text-foreground hover:underline">
            {corso.titolo}
          </Link>
          <Badge variant={corso.attivo ? "default" : "secondary"}>
            {corso.attivo ? "Attivo" : "Disattivato"}
          </Badge>
          {nienteAcquistabile && <Badge variant="destructive">Da configurare</Badge>}
          {corso.sold_out_manuale && <Badge variant="destructive">Sold out (manuale)</Badge>}
          {corso.iscrizioni_chiuse_manuale && (
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              Iscrizioni chiuse (manuale)
            </Badge>
          )}
        </div>
        {corso.descrizione && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 max-w-2xl">
            {corso.descrizione}
          </p>
        )}
        {corso.calendario && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1 max-w-2xl">
            📅 {corso.calendario}
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          {riepilogoPrezzo(moduli, pacchetti)} · {iscritti} iscritti verificati · bonifico su{" "}
          {METODI_PAGAMENTO[corso.metodo_pagamento].etichetta}
          {corso.early_bird_scadenza !== null && (
            <> · early bird {corso.early_bird_percentuale}% fino al {formattaData(corso.early_bird_scadenza)}</>
          )}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Button asChild size="sm" variant="outline" className={bottoneClasse}>
          <Link href={`/admin/corsi/${corso.id}`}>Gestisci moduli</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className={bottoneClasse}>
          <Link href={`/admin/corsi/${corso.id}/iscritti`}>Iscrizioni</Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={bottoneClasse}
          onClick={() => setInModifica(true)}
          disabled={isLoading}
        >
          Modifica
        </Button>
        <Button size="sm" variant="outline" className={bottoneClasse} onClick={handleDuplica} disabled={isLoading}>
          Duplica
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={bottoneClasse}
          onClick={handleToggleAttivo}
          disabled={isLoading}
        >
          {corso.attivo ? "Disattiva" : "Attiva"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={bottoneClasse}
          onClick={handleToggleSoldOut}
          disabled={isLoading}
        >
          {corso.sold_out_manuale ? "Rimuovi sold out" : "Segna sold out"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={bottoneClasse}
          onClick={handleToggleIscrizioniChiuse}
          disabled={isLoading}
        >
          {corso.iscrizioni_chiuse_manuale ? "Riapri iscrizioni" : "Chiudi iscrizioni"}
        </Button>
        {confermaEliminazione ? (
          <>
            <Button
              size="sm"
              variant="destructive"
              className={bottoneClasse}
              onClick={handleElimina}
              disabled={isLoading}
            >
              Conferma eliminazione
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={bottoneClasse}
              onClick={() => setConfermaEliminazione(false)}
              disabled={isLoading}
            >
              Annulla
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            className={bottoneClasse}
            onClick={() => setConfermaEliminazione(true)}
            disabled={isLoading}
          >
            Elimina
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 w-full">
          {error}
        </p>
      )}
    </div>
  );
}
