"use client";

import { useState } from "react";
import { aggiornaDatiAccount, type DatiAzienda } from "@/app/(autenticato)/account/actions";
import type { DatiFatturazione, DatiFiscali } from "@/app/(autenticato)/iscrizione/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function AccountForm({
  datiIniziali,
  fatturazioneIniziale,
  aziendaIniziale,
}: {
  datiIniziali: DatiFiscali;
  fatturazioneIniziale: DatiFatturazione;
  aziendaIniziale: DatiAzienda;
}) {
  const [fiscali, setFiscali] = useState<DatiFiscali>(datiIniziali);
  const [fatturazione, setFatturazione] = useState<DatiFatturazione>(fatturazioneIniziale);
  const [azienda, setAzienda] = useState<DatiAzienda>(aziendaIniziale);
  const [error, setError] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const campo = (chiave: keyof DatiFiscali) => ({
    value: fiscali[chiave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setSalvato(false);
      setFiscali((prev) => ({ ...prev, [chiave]: e.target.value }));
    },
  });

  const campoFatturazione = (chiave: keyof DatiFatturazione) => ({
    value: fatturazione[chiave] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setSalvato(false);
      setFatturazione((prev) => ({ ...prev, [chiave]: e.target.value }));
    },
  });

  const campoAzienda = (chiave: keyof DatiAzienda) => ({
    value: azienda[chiave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setSalvato(false);
      setAzienda((prev) => ({ ...prev, [chiave]: e.target.value }));
    },
  });

  const isAzienda = fiscali.tipo_soggetto === "azienda";
  const isLiberoProfessionista = fiscali.tipo_soggetto === "libero_professionista";
  const richiedePartitaIva = isAzienda || isLiberoProfessionista;
  const etichettaRagioneSociale = isAzienda
    ? "Ragione sociale"
    : isLiberoProfessionista
      ? "Nome e cognome / Ragione sociale"
      : "Nome e cognome";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSalvato(false);
    setIsLoading(true);
    const risultato = await aggiornaDatiAccount(fiscali, fatturazione, azienda);
    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    setSalvato(true);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label>Tipo soggetto</Label>
          <RadioGroup
            value={fiscali.tipo_soggetto}
            onValueChange={(value) => {
              setSalvato(false);
              setFiscali((prev) => ({ ...prev, tipo_soggetto: value as DatiFiscali["tipo_soggetto"] }));
            }}
            className="flex flex-wrap gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="privato" id="acc-tipo-privato" />
              <Label htmlFor="acc-tipo-privato" className="font-normal">Privato</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="libero_professionista" id="acc-tipo-libero-professionista" />
              <Label htmlFor="acc-tipo-libero-professionista" className="font-normal">
                Libero professionista
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="azienda" id="acc-tipo-azienda" />
              <Label htmlFor="acc-tipo-azienda" className="font-normal">Azienda</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-ragione-sociale" className="min-h-10 items-start">
              {etichettaRagioneSociale}
            </Label>
            <Input id="acc-ragione-sociale" required {...campo("ragione_sociale")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-cellulare" className="min-h-10 items-start">Cellulare</Label>
            <Input id="acc-cellulare" required {...campo("cellulare")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-codice-fiscale">Codice fiscale</Label>
            <Input id="acc-codice-fiscale" required {...campo("codice_fiscale")} />
          </div>
          {richiedePartitaIva ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-partita-iva">Partita IVA</Label>
              <Input id="acc-partita-iva" required {...campo("partita_iva")} />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-data-nascita">Data di nascita</Label>
              <Input id="acc-data-nascita" type="date" required {...campo("data_nascita")} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="acc-indirizzo">Indirizzo</Label>
          <Input id="acc-indirizzo" required {...campo("indirizzo")} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-cap">CAP</Label>
            <Input id="acc-cap" required {...campo("cap")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-citta">Città</Label>
            <Input id="acc-citta" required {...campo("citta")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-provincia">Provincia</Label>
            <Input id="acc-provincia" required {...campo("provincia")} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="acc-nazione">Nazione</Label>
          <Input id="acc-nazione" required {...campo("nazione")} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-codice-sdi">Codice destinatario SDI</Label>
            <Input id="acc-codice-sdi" placeholder="Facoltativo se PEC" {...campo("codice_sdi")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-pec">PEC</Label>
            <Input id="acc-pec" placeholder="Facoltativo se SDI" {...campo("pec")} />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-medium text-foreground">Azienda</h2>
          <p className="text-sm text-muted-foreground">Facoltativo — dove lavori e con quale ruolo.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-azienda">Azienda</Label>
            <Input id="acc-azienda" {...campoAzienda("azienda")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-ruolo-aziendale">Ruolo in azienda</Label>
            <Input id="acc-ruolo-aziendale" {...campoAzienda("ruolo_aziendale")} />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <h2 className="font-medium text-foreground">Fatturazione a soggetto diverso</h2>
            <p className="text-sm text-muted-foreground">
              Attiva solo se la fattura va intestata a qualcun altro rispetto a te (es.
              un&apos;azienda). Vale per tutte le tue iscrizioni, comprese quelle su misura.
            </p>
          </div>
          <Checkbox
            checked={fatturazione.diversa}
            onCheckedChange={(v) => {
              setSalvato(false);
              setFatturazione((prev) => ({ ...prev, diversa: v === true }));
            }}
          />
        </label>

        {fatturazione.diversa && (
          <div className="flex flex-col gap-4 pt-4 border-t border-dashed border-border">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-fatt-intestazione">Intestazione</Label>
                <Input id="acc-fatt-intestazione" required {...campoFatturazione("intestazione")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-fatt-cf-piva">Codice fiscale / P. IVA</Label>
                <Input id="acc-fatt-cf-piva" required {...campoFatturazione("codice_fiscale_piva")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-fatt-indirizzo">Indirizzo</Label>
                <Input id="acc-fatt-indirizzo" required {...campoFatturazione("indirizzo")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-fatt-cap">CAP</Label>
                <Input id="acc-fatt-cap" required {...campoFatturazione("cap")} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-fatt-sdi">Codice destinatario (SDI)</Label>
              <Input id="acc-fatt-sdi" {...campoFatturazione("codice_sdi")} />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {salvato && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          Dati salvati ✓
        </p>
      )}

      <Button type="submit" disabled={isLoading} className="w-fit">
        {isLoading ? "Salvataggio…" : "Salva"}
      </Button>
    </form>
  );
}
