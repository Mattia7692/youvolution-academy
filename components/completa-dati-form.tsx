"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completaDatiIscrizione, type DatiFiscali } from "@/app/(autenticato)/iscrizione/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function CompletaDatiForm({
  iscrizioneId,
  datiIniziali,
}: {
  iscrizioneId: string;
  datiIniziali: DatiFiscali;
}) {
  const router = useRouter();
  const [fiscali, setFiscali] = useState<DatiFiscali>(datiIniziali);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const campo = (chiave: keyof DatiFiscali) => ({
    value: fiscali[chiave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setFiscali((prev) => ({ ...prev, [chiave]: e.target.value })),
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
    setIsLoading(true);
    const risultato = await completaDatiIscrizione(iscrizioneId, fiscali);
    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }

    router.push("/le-mie-iscrizioni");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <Label>Tipo soggetto</Label>
        <RadioGroup
          value={fiscali.tipo_soggetto}
          onValueChange={(value) =>
            setFiscali((prev) => ({ ...prev, tipo_soggetto: value as DatiFiscali["tipo_soggetto"] }))
          }
          className="flex flex-wrap gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="privato" id="cd-tipo-privato" />
            <Label htmlFor="cd-tipo-privato" className="font-normal">Privato</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="libero_professionista" id="cd-tipo-libero-professionista" />
            <Label htmlFor="cd-tipo-libero-professionista" className="font-normal">
              Libero professionista
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="azienda" id="cd-tipo-azienda" />
            <Label htmlFor="cd-tipo-azienda" className="font-normal">Azienda</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cd-ragione-sociale" className="min-h-10 items-start">
            {etichettaRagioneSociale}
          </Label>
          <Input id="cd-ragione-sociale" required {...campo("ragione_sociale")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cd-cellulare" className="min-h-10 items-start">Cellulare</Label>
          <Input id="cd-cellulare" required {...campo("cellulare")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cd-codice-fiscale">Codice fiscale</Label>
          <Input id="cd-codice-fiscale" required {...campo("codice_fiscale")} />
        </div>
        {richiedePartitaIva ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-partita-iva">Partita IVA</Label>
            <Input id="cd-partita-iva" required {...campo("partita_iva")} />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-data-nascita">Data di nascita</Label>
            <Input id="cd-data-nascita" type="date" required {...campo("data_nascita")} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cd-indirizzo">Indirizzo</Label>
        <Input id="cd-indirizzo" required {...campo("indirizzo")} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cd-cap">CAP</Label>
          <Input id="cd-cap" required {...campo("cap")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cd-citta">Città</Label>
          <Input id="cd-citta" required {...campo("citta")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cd-provincia">Provincia</Label>
          <Input id="cd-provincia" required {...campo("provincia")} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cd-nazione">Nazione</Label>
        <Input id="cd-nazione" required {...campo("nazione")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cd-codice-sdi">Codice destinatario SDI</Label>
          <Input id="cd-codice-sdi" placeholder="Facoltativo se PEC" {...campo("codice_sdi")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cd-pec">PEC</Label>
          <Input id="cd-pec" placeholder="Facoltativo se SDI" {...campo("pec")} />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isLoading} className="w-fit">
        {isLoading ? "Salvataggio…" : "Salva e continua"}
      </Button>
    </form>
  );
}
