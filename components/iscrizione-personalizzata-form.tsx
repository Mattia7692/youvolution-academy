"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { creaIscrizionePersonalizzata } from "@/app/(autenticato)/admin/actions";
import { createClient } from "@/lib/supabase/client";
import { formattaPrezzo } from "@/lib/prezzo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Corsista = { id: string; nome: string; cognome: string; email: string };
type Corso = { id: string; titolo: string };
type ModuloCorso = { id: string; titolo: string };
type RataForm = { importo: string; scadenza: string };

export function IscrizionePersonalizzataForm({
  corsisti,
  corsi,
}: {
  corsisti: Corsista[];
  corsi: Corso[];
}) {
  const router = useRouter();

  const [queryCorsista, setQueryCorsista] = useState("");
  const [corsistaId, setCorsistaId] = useState<string | null>(null);

  const [corsoId, setCorsoId] = useState<string | null>(null);
  const [moduli, setModuli] = useState<ModuloCorso[]>([]);
  const [moduloIdsSelezionati, setModuloIdsSelezionati] = useState<string[]>([]);
  const [caricandoModuli, setCaricandoModuli] = useState(false);

  const [rate, setRate] = useState<RataForm[]>([{ importo: "", scadenza: "" }]);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const qCorsista = queryCorsista.trim().toLowerCase();
  // Nessun elenco mostrato finche' non si digita: potenzialmente centinaia di
  // utenti, la ricerca serve a trovare la persona, non a scorrere la lista.
  const corsistiFiltrati = qCorsista
    ? corsisti.filter(
        (c) =>
          c.nome.toLowerCase().includes(qCorsista) ||
          c.cognome.toLowerCase().includes(qCorsista) ||
          c.email.toLowerCase().includes(qCorsista),
      )
    : [];
  const corsistaSelezionato = corsisti.find((c) => c.id === corsistaId) ?? null;

  // Al cambio corso, ricarica i moduli attivi di quel corso e seleziona tutti
  // per default: nel caso comune l'accordo copre l'intero corso, l'admin
  // deseleziona solo se serve limitarlo.
  useEffect(() => {
    if (!corsoId) return;
    let cancellato = false;
    const supabase = createClient();
    (async () => {
      setCaricandoModuli(true);
      const { data } = await supabase
        .from("moduli_corso")
        .select("id, titolo")
        .eq("corso_id", corsoId)
        .eq("attivo", true)
        .order("ordine", { ascending: true });
      if (cancellato) return;
      const elenco = data ?? [];
      setModuli(elenco);
      setModuloIdsSelezionati(elenco.map((m) => m.id));
      setCaricandoModuli(false);
    })();
    return () => {
      cancellato = true;
    };
  }, [corsoId]);

  const toggleModulo = (moduloId: string) => {
    setModuloIdsSelezionati((prev) =>
      prev.includes(moduloId) ? prev.filter((id) => id !== moduloId) : [...prev, moduloId],
    );
  };

  const aggiungiRata = () => setRate((prev) => [...prev, { importo: "", scadenza: "" }]);
  const rimuoviRata = (indice: number) =>
    setRate((prev) => prev.filter((_, i) => i !== indice));
  const aggiornaRata = (indice: number, campo: keyof RataForm, valore: string) =>
    setRate((prev) => prev.map((r, i) => (i === indice ? { ...r, [campo]: valore } : r)));

  const totale = useMemo(
    () => rate.reduce((somma, r) => somma + (Number(r.importo) || 0), 0),
    [rate],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!corsistaId) {
      setError("Seleziona un corsista.");
      return;
    }
    if (!corsoId) {
      setError("Seleziona un corso.");
      return;
    }
    if (moduloIdsSelezionati.length === 0) {
      setError("Seleziona almeno un modulo.");
      return;
    }
    const rateValide = rate.map((r) => ({
      importo: Number(r.importo),
      scadenza: r.scadenza || null,
    }));
    if (rateValide.length === 0 || rateValide.some((r) => !(r.importo > 0))) {
      setError("Ogni rata deve avere un importo positivo.");
      return;
    }

    setIsLoading(true);
    const risultato = await creaIscrizionePersonalizzata({
      corsistaId,
      corsoId,
      moduloIds: moduloIdsSelezionati,
      rate: rateValide,
    });
    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }

    router.push("/admin/coda-verifica");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-3">
        <h2 className="font-medium text-foreground">Corso e moduli</h2>
        <Select value={corsoId ?? undefined} onValueChange={(v) => setCorsoId(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleziona un corso" />
          </SelectTrigger>
          <SelectContent>
            {corsi.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.titolo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {caricandoModuli && <p className="text-sm text-muted-foreground">Caricamento moduli…</p>}
        {!caricandoModuli && corsoId && moduli.length > 0 && (
          <div className="flex flex-col gap-2">
            {moduli.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-border p-2.5 cursor-pointer"
              >
                <Checkbox
                  checked={moduloIdsSelezionati.includes(m.id)}
                  onCheckedChange={() => toggleModulo(m.id)}
                />
                <span className="text-sm text-foreground">{m.titolo}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-3">
        <h2 className="font-medium text-foreground">Corsista</h2>
        {corsistaSelezionato ? (
          <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {corsistaSelezionato.nome} {corsistaSelezionato.cognome}
              </p>
              <p className="text-sm text-muted-foreground">{corsistaSelezionato.email}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setCorsistaId(null)}>
              Cambia
            </Button>
          </div>
        ) : (
          <>
            <Input
              value={queryCorsista}
              onChange={(e) => setQueryCorsista(e.target.value)}
              placeholder="Cerca per nome o email…"
            />
            {qCorsista && (
              <div className="max-h-56 overflow-y-auto flex flex-col gap-2 p-0.5">
                {corsistiFiltrati.slice(0, 30).map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCorsistaId(c.id)}
                    className="text-left rounded-lg border border-border px-4 py-3 hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {c.nome} {c.cognome}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.email}</p>
                  </button>
                ))}
                {corsistiFiltrati.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nessun utente trovato.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-foreground">Piano di pagamento</h2>
          <span className="text-sm font-semibold text-foreground">
            Totale: {formattaPrezzo(totale)}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {rate.map((r, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label>Rata {i + 1} — importo</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={r.importo}
                  onChange={(e) => aggiornaRata(i, "importo", e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <Label>Scadenza (facoltativa)</Label>
                <Input
                  type="date"
                  value={r.scadenza}
                  onChange={(e) => aggiornaRata(i, "scadenza", e.target.value)}
                />
              </div>
              {rate.length > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={() => rimuoviRata(i)}>
                  Rimuovi
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={aggiungiRata}>
          Aggiungi rata
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        I dati anagrafici/fiscali e l&apos;eventuale fatturazione a soggetto diverso vengono
        recuperati dall&apos;account del corsista (sezione &quot;Il mio account&quot;); se mancanti,
        sarà lui stesso a completarli da &quot;Le mie iscrizioni&quot;. Creando l&apos;iscrizione
        attesti inoltre di aver raccolto il consenso alle condizioni contrattuali e
        all&apos;informativa privacy fuori dalla piattaforma (email/contratto).
      </p>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isLoading} className="w-fit">
        {isLoading ? "Creazione…" : "Crea iscrizione"}
      </Button>
    </form>
  );
}
