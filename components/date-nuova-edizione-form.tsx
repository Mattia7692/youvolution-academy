"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aggiornaDateNuovaEdizione } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ModuloData = { id: string; titolo: string; scadenza_iscrizione: string; data_inizio: string };
type PacchettoData = { id: string; titolo: string; scadenza_iscrizione: string };

export function DateNuovaEdizioneForm({
  corsoId,
  calendarioIniziale,
  earlyBirdScadenzaIniziale,
  earlyBirdPercentuale,
  moduli,
  pacchetti,
}: {
  corsoId: string;
  calendarioIniziale: string;
  earlyBirdScadenzaIniziale: string | null;
  earlyBirdPercentuale: number | null;
  moduli: ModuloData[];
  pacchetti: PacchettoData[];
}) {
  const [calendario, setCalendario] = useState(calendarioIniziale);
  const [earlyBirdScadenza, setEarlyBirdScadenza] = useState(earlyBirdScadenzaIniziale ?? "");
  const [moduliState, setModuliState] = useState(moduli);
  const [pacchettiState, setPacchettiState] = useState(pacchetti);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const aggiornaModulo = (id: string, campo: "scadenza_iscrizione" | "data_inizio", valore: string) => {
    setModuliState((prev) => prev.map((m) => (m.id === id ? { ...m, [campo]: valore } : m)));
  };

  const aggiornaPacchetto = (id: string, valore: string) => {
    setPacchettiState((prev) => prev.map((p) => (p.id === id ? { ...p, scadenza_iscrizione: valore } : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const risultato = await aggiornaDateNuovaEdizione(corsoId, {
      calendario,
      earlyBirdScadenza: earlyBirdPercentuale !== null ? earlyBirdScadenza : undefined,
      moduli: moduliState.map(({ id, scadenza_iscrizione, data_inizio }) => ({
        id,
        scadenza_iscrizione,
        data_inizio,
      })),
      pacchetti: pacchettiState.map(({ id, scadenza_iscrizione }) => ({ id, scadenza_iscrizione })),
    });

    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }

    router.push(`/admin/corsi/${corsoId}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {earlyBirdPercentuale !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Early bird (-{earlyBirdPercentuale}%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1 max-w-[200px]">
              <Label className="text-xs text-muted-foreground">Scadenza</Label>
              <Input
                type="date"
                required
                value={earlyBirdScadenza}
                onChange={(e) => setEarlyBirdScadenza(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {moduliState.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Moduli</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {moduliState.map((modulo) => (
              <div key={modulo.id} className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
                <p className="text-sm font-medium text-foreground pb-2">{modulo.titolo}</p>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Scadenza iscrizione</Label>
                  <Input
                    type="date"
                    required
                    value={modulo.scadenza_iscrizione}
                    onChange={(e) => aggiornaModulo(modulo.id, "scadenza_iscrizione", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Data di inizio</Label>
                  <Input
                    type="date"
                    required
                    value={modulo.data_inizio}
                    onChange={(e) => aggiornaModulo(modulo.id, "data_inizio", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pacchettiState.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pacchetti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pacchettiState.map((pacchetto) => (
              <div key={pacchetto.id} className="grid grid-cols-[1fr_auto] items-end gap-3">
                <p className="text-sm font-medium text-foreground pb-2">{pacchetto.titolo}</p>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Scadenza iscrizione</Label>
                  <Input
                    type="date"
                    required
                    value={pacchetto.scadenza_iscrizione}
                    onChange={(e) => aggiornaPacchetto(pacchetto.id, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calendario / date (testo libero)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={calendario}
            onChange={(e) => setCalendario(e.target.value)}
            placeholder="Aggiorna se contiene date della vecchia edizione (facoltativo)"
          />
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Salvataggio…" : "Salva date"}
      </Button>
    </form>
  );
}
