"use client";

import { useState } from "react";
import {
  verificaIscrizione,
  segnalaIscrizione,
  inviaCodiceFirstMover,
} from "@/app/(autenticato)/admin/actions";
import { StatoBadge, type StatoIscrizione } from "@/components/stato-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ScontoTipo = "nessuno" | "early_bird" | "first_mover" | "codice";

const SFONDO_PER_SCONTO: Record<ScontoTipo, string> = {
  first_mover: "border-violet-200 bg-violet-50",
  early_bird: "border-emerald-200 bg-emerald-50",
  codice: "border-blue-200 bg-blue-50",
  nessuno: "border-border bg-card",
};

const ETICHETTA_SCONTO: Record<ScontoTipo, string> = {
  first_mover: "First mover",
  early_bird: "Early bird",
  codice: "Codice",
  nessuno: "Nessuno sconto",
};

const STILE_TAG_SCONTO: Record<ScontoTipo, string> = {
  first_mover: "bg-violet-100 text-violet-800",
  early_bird: "bg-emerald-100 text-emerald-800",
  codice: "bg-blue-100 text-blue-800",
  nessuno: "bg-muted text-muted-foreground",
};

export function CodaVerificaRiga({
  iscrizioneId,
  stato,
  scontoTipo,
  scontoPercentuale,
  codiceScontoInserito,
  corsoTitolo,
  prezzo,
  cro,
  notaAdmin,
  corsistaNome,
  corsistaEmail,
}: {
  iscrizioneId: string;
  stato: StatoIscrizione;
  scontoTipo: ScontoTipo;
  scontoPercentuale: number | null;
  codiceScontoInserito: string | null;
  corsoTitolo: string;
  prezzo: string;
  cro: string | null;
  notaAdmin: string | null;
  corsistaNome: string;
  corsistaEmail: string;
}) {
  const [mostraSegnalazione, setMostraSegnalazione] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [codiceFirstMover, setCodiceFirstMover] = useState<string | null>(null);
  const [emailInviata, setEmailInviata] = useState(false);
  const [copiato, setCopiato] = useState(false);

  const handleVerifica = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await verificaIscrizione(iscrizioneId);
    setIsLoading(false);
    if (!risultato.ok) setError(risultato.error);
  };

  const handleInviaCodice = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await inviaCodiceFirstMover(iscrizioneId);
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      if (risultato.codice) setCodiceFirstMover(risultato.codice);
      return;
    }
    setCodiceFirstMover(risultato.codice);
    setEmailInviata(true);
  };

  const handleCopiaCodice = async () => {
    if (!codiceFirstMover) return;
    await navigator.clipboard.writeText(codiceFirstMover);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2000);
  };

  const handleSegnala = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await segnalaIscrizione(iscrizioneId, nota);
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    setMostraSegnalazione(false);
    setNota("");
  };

  return (
    <div className={`rounded-xl border p-5 space-y-3 ${SFONDO_PER_SCONTO[scontoTipo]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{corsoTitolo}</p>
          <p className="text-sm text-muted-foreground">
            {corsistaNome} · {corsistaEmail}
          </p>
          <p className="text-sm text-muted-foreground">
            {prezzo}
            {cro && ` · CRO ${cro}`}
          </p>
          {notaAdmin && stato === "cro_da_chiarire" && (
            <p className="text-sm text-red-700 mt-1">{notaAdmin}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${STILE_TAG_SCONTO[scontoTipo]}`}
          >
            {ETICHETTA_SCONTO[scontoTipo]}
            {scontoTipo !== "nessuno" && scontoPercentuale !== null && ` (-${scontoPercentuale}%)`}
            {scontoTipo === "codice" && codiceScontoInserito && ` · ${codiceScontoInserito}`}
          </span>
          <StatoBadge stato={stato} />
        </div>
      </div>

      {codiceFirstMover && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-200 bg-violet-100/60 px-3 py-2 text-sm text-violet-900">
          <span>
            {emailInviata ? `Email inviata a ${corsistaEmail} · codice` : "Codice per completare il corso"}:{" "}
            <span className="font-mono font-semibold">{codiceFirstMover}</span>
          </span>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={handleCopiaCodice}>
            {copiato ? "Copiato ✓" : "Copia"}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {mostraSegnalazione ? (
        <div className="space-y-2">
          <Textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Motivo della segnalazione (es. CRO non corrisponde all'importo)"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleSegnala} disabled={isLoading}>
              Conferma segnalazione
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMostraSegnalazione(false)}>
              Annulla
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleVerifica} disabled={isLoading}>
            Verifica
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMostraSegnalazione(true)}
            disabled={isLoading}
          >
            Segnala
          </Button>
          {scontoTipo === "first_mover" && !emailInviata && (
            <Button
              size="sm"
              variant="outline"
              className="border-violet-300 text-violet-800 hover:bg-violet-100"
              onClick={handleInviaCodice}
              disabled={isLoading}
            >
              Invia codice sconto first mover
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
