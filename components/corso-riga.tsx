"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { aggiornaCorso, eliminaCorso } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export type Corso = {
  id: string;
  titolo: string;
  descrizione: string | null;
  calendario: string | null;
  prezzo: number | null;
  attivo: boolean;
  posti_disponibili: number | null;
};

function formattaPrezzo(prezzo: number | null) {
  if (prezzo === null) return "Prezzo da impostare";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(prezzo);
}

export function CorsoRiga({ corso, iscritti }: { corso: Corso; iscritti: number }) {
  const [inModifica, setInModifica] = useState(false);
  const [titolo, setTitolo] = useState(corso.titolo);
  const [descrizione, setDescrizione] = useState(corso.descrizione ?? "");
  const [calendario, setCalendario] = useState(corso.calendario ?? "");
  const [prezzo, setPrezzo] = useState(corso.prezzo === null ? "" : String(corso.prezzo));
  const [postiDisponibili, setPostiDisponibili] = useState(
    corso.posti_disponibili === null ? "" : String(corso.posti_disponibili),
  );
  const [confermaEliminazione, setConfermaEliminazione] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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
      prezzo: prezzo.trim() === "" ? null : Number(prezzo),
      posti_disponibili: postiDisponibili.trim() === "" ? null : Number(postiDisponibili),
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
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Prezzo (€)"
            value={prezzo}
            onChange={(e) => setPrezzo(e.target.value)}
          />
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="Posti disponibili (vuoto = illimitati)"
            value={postiDisponibili}
            onChange={(e) => setPostiDisponibili(e.target.value)}
          />
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

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/admin/corsi/${corso.id}`} className="font-medium text-foreground hover:underline">
            {corso.titolo}
          </Link>
          <Badge variant={corso.attivo ? "default" : "secondary"}>
            {corso.attivo ? "Attivo" : "Disattivato"}
          </Badge>
          {corso.prezzo === null && <Badge variant="destructive">Da revisionare</Badge>}
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
          {formattaPrezzo(corso.prezzo)} · {iscritti}
          {corso.posti_disponibili !== null ? ` / ${corso.posti_disponibili}` : ""} iscritti
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/admin/corsi/${corso.id}`}>Vedi iscritti</Link>
        </Button>
        <Button size="sm" variant="outline" onClick={() => setInModifica(true)} disabled={isLoading}>
          Modifica
        </Button>
        <Button size="sm" variant="outline" onClick={handleToggleAttivo} disabled={isLoading}>
          {corso.attivo ? "Disattiva" : "Attiva"}
        </Button>
        {confermaEliminazione ? (
          <>
            <Button size="sm" variant="destructive" onClick={handleElimina} disabled={isLoading}>
              Conferma eliminazione
            </Button>
            <Button
              size="sm"
              variant="outline"
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
