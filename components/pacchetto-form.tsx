"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { creaPacchetto } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formattaPrezzo } from "@/lib/prezzo";
import type { ModuloCorso } from "@/components/modulo-riga";

type ModalitaPrezzo = "fisso" | "somma_sconto";

export function PacchettoForm({ corsoId, moduli }: { corsoId: string; moduli: ModuloCorso[] }) {
  const [aperto, setAperto] = useState(false);
  const [titolo, setTitolo] = useState("Tutti i moduli");
  const [modalitaPrezzo, setModalitaPrezzo] = useState<ModalitaPrezzo>("fisso");
  const [imponibile, setImponibile] = useState("");
  const [scontoPercentuale, setScontoPercentuale] = useState("");
  const [scadenzaIscrizione, setScadenzaIscrizione] = useState("");
  const [postiDisponibili, setPostiDisponibili] = useState("");
  const [moduloIds, setModuloIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const sommaModuli = useMemo(
    () => moduli.filter((m) => moduloIds.includes(m.id)).reduce((somma, m) => somma + m.imponibile, 0),
    [moduli, moduloIds],
  );

  const imponibileScontato =
    Math.round(sommaModuli * (1 - (Number(scontoPercentuale) || 0) / 100) * 100) / 100;

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
      imponibile: modalitaPrezzo === "fisso" ? Number(imponibile) : imponibileScontato,
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
    setModalitaPrezzo("fisso");
    setImponibile("");
    setScontoPercentuale("");
    setScadenzaIscrizione("");
    setPostiDisponibili("");
    setModuloIds([]);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-dashed border-border p-4 space-y-3">
      <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Titolo pacchetto" required />

      <div>
        <Label className="text-xs text-muted-foreground">Moduli inclusi</Label>
        <div className="flex flex-col gap-1.5 mt-1">
          {moduli.map((m) => (
            <label key={m.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <Checkbox checked={moduloIds.includes(m.id)} onCheckedChange={() => toggleModulo(m.id)} />
                {m.titolo}
              </span>
              <span className="text-muted-foreground">{formattaPrezzo(m.imponibile)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Prezzo del pacchetto</Label>
        <RadioGroup
          value={modalitaPrezzo}
          onValueChange={(v) => setModalitaPrezzo(v as ModalitaPrezzo)}
          className="gap-2"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="fisso" id="prezzo-fisso" />
            <Label htmlFor="prezzo-fisso" className="font-normal text-sm">
              Prezzo fisso
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="somma_sconto" id="prezzo-somma-sconto" />
            <Label htmlFor="prezzo-somma-sconto" className="font-normal text-sm">
              Somma dei moduli selezionati meno uno sconto %
            </Label>
          </div>
        </RadioGroup>

        {modalitaPrezzo === "fisso" ? (
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Imponibile (€)"
            required
            value={imponibile}
            onChange={(e) => setImponibile(e.target.value)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Sconto %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                value={scontoPercentuale}
                onChange={(e) => setScontoPercentuale(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Somma moduli: {formattaPrezzo(sommaModuli)}
              <br />
              Prezzo pacchetto: <span className="font-medium text-foreground">{formattaPrezzo(imponibileScontato)}</span>
            </p>
          </div>
        )}
      </div>

      <Input
        type="number"
        min="0"
        step="1"
        placeholder="Posti (vuoto = illimitati)"
        value={postiDisponibili}
        onChange={(e) => setPostiDisponibili(e.target.value)}
      />
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Scadenza iscrizione</Label>
        <Input
          type="date"
          required
          value={scadenzaIscrizione}
          onChange={(e) => setScadenzaIscrizione(e.target.value)}
        />
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
