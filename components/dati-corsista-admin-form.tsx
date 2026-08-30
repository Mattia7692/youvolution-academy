"use client";

import { useState } from "react";
import { aggiornaDatiCorsista, type DatiCorsistaAdmin } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function DatiCorsistaAdminForm({
  profiloId,
  datiIniziali,
  onChiudi,
}: {
  profiloId: string;
  datiIniziali: DatiCorsistaAdmin;
  onChiudi?: () => void;
}) {
  const [dati, setDati] = useState<DatiCorsistaAdmin>(datiIniziali);
  const [error, setError] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const campo = (chiave: keyof DatiCorsistaAdmin) => ({
    value: dati[chiave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setSalvato(false);
      setDati((prev) => ({ ...prev, [chiave]: e.target.value }));
    },
  });

  const isAzienda = dati.tipo_soggetto === "azienda";
  const isLiberoProfessionista = dati.tipo_soggetto === "libero_professionista";
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
    const risultato = await aggiornaDatiCorsista(profiloId, dati);
    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    setSalvato(true);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label>Tipo soggetto</Label>
        <RadioGroup
          value={dati.tipo_soggetto}
          onValueChange={(value) => {
            setSalvato(false);
            setDati((prev) => ({ ...prev, tipo_soggetto: value as DatiCorsistaAdmin["tipo_soggetto"] }));
          }}
          className="flex flex-wrap gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="privato" id="crm-tipo-privato" />
            <Label htmlFor="crm-tipo-privato" className="font-normal">Privato</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="libero_professionista" id="crm-tipo-libero-professionista" />
            <Label htmlFor="crm-tipo-libero-professionista" className="font-normal">
              Libero professionista
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="azienda" id="crm-tipo-azienda" />
            <Label htmlFor="crm-tipo-azienda" className="font-normal">Azienda</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="crm-ragione-sociale" className="min-h-10 items-start">
            {etichettaRagioneSociale}
          </Label>
          <Input id="crm-ragione-sociale" {...campo("ragione_sociale")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="crm-cellulare" className="min-h-10 items-start">Cellulare</Label>
          <Input id="crm-cellulare" {...campo("cellulare")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="crm-codice-fiscale">Codice fiscale</Label>
          <Input id="crm-codice-fiscale" {...campo("codice_fiscale")} />
        </div>
        {richiedePartitaIva ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="crm-partita-iva">Partita IVA</Label>
            <Input id="crm-partita-iva" {...campo("partita_iva")} />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="crm-data-nascita">Data di nascita</Label>
            <Input id="crm-data-nascita" type="date" {...campo("data_nascita")} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="crm-indirizzo">Indirizzo</Label>
        <Input id="crm-indirizzo" {...campo("indirizzo")} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="crm-cap">CAP</Label>
          <Input id="crm-cap" {...campo("cap")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="crm-citta">Città</Label>
          <Input id="crm-citta" {...campo("citta")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="crm-provincia">Provincia</Label>
          <Input id="crm-provincia" {...campo("provincia")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="crm-codice-sdi">Codice destinatario SDI</Label>
          <Input id="crm-codice-sdi" {...campo("codice_sdi")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="crm-pec">PEC</Label>
          <Input id="crm-pec" {...campo("pec")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-dashed border-border">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="crm-azienda">Azienda</Label>
          <Input id="crm-azienda" {...campo("azienda")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="crm-ruolo-aziendale">Ruolo in azienda</Label>
          <Input id="crm-ruolo-aziendale" {...campo("ruolo_aziendale")} />
        </div>
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

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading} className="w-fit">
          {isLoading ? "Salvataggio…" : "Salva"}
        </Button>
        {onChiudi && (
          <Button type="button" variant="outline" disabled={isLoading} className="w-fit" onClick={onChiudi}>
            Chiudi
          </Button>
        )}
      </div>
    </form>
  );
}
