"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvaModulo1, type DatiFiscali } from "@/app/(autenticato)/iscrizione/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const VUOTO: DatiFiscali = {
  tipo_soggetto: "privato",
  ragione_sociale: "",
  codice_fiscale: "",
  partita_iva: "",
  indirizzo: "",
  cap: "",
  citta: "",
  provincia: "",
  nazione: "IT",
  codice_sdi: "",
  pec: "",
};

export function Modulo1Form({ corsoId }: { corsoId: string }) {
  const [dati, setDati] = useState<DatiFiscali>(VUOTO);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const campo = (chiave: keyof DatiFiscali) => ({
    value: dati[chiave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setDati((prev) => ({ ...prev, [chiave]: e.target.value })),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const risultato = await salvaModulo1(corsoId, dati);
    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }

    router.push(`/iscrizione/${corsoId}/modulo-2`);
  };

  const isAzienda = dati.tipo_soggetto === "azienda";

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-card border border-border shadow-xl p-7 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label>Tipo soggetto</Label>
        <RadioGroup
          value={dati.tipo_soggetto}
          onValueChange={(value) =>
            setDati((prev) => ({ ...prev, tipo_soggetto: value as DatiFiscali["tipo_soggetto"] }))
          }
          className="flex gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="privato" id="tipo-privato" />
            <Label htmlFor="tipo-privato" className="font-normal">Privato</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="azienda" id="tipo-azienda" />
            <Label htmlFor="tipo-azienda" className="font-normal">Azienda</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ragione_sociale">
          {isAzienda ? "Ragione sociale" : "Nome e cognome fatturazione"}
        </Label>
        <Input id="ragione_sociale" required {...campo("ragione_sociale")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="codice_fiscale">Codice fiscale</Label>
          <Input id="codice_fiscale" required {...campo("codice_fiscale")} />
        </div>
        {isAzienda && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partita_iva">Partita IVA</Label>
            <Input id="partita_iva" required {...campo("partita_iva")} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="indirizzo">Indirizzo</Label>
        <Input id="indirizzo" required {...campo("indirizzo")} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cap">CAP</Label>
          <Input id="cap" required {...campo("cap")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="citta">Città</Label>
          <Input id="citta" required {...campo("citta")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="provincia">Provincia</Label>
          <Input id="provincia" required {...campo("provincia")} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nazione">Nazione</Label>
        <Input id="nazione" required {...campo("nazione")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="codice_sdi">Codice destinatario SDI</Label>
          <Input id="codice_sdi" placeholder="Facoltativo se PEC" {...campo("codice_sdi")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pec">PEC</Label>
          <Input id="pec" placeholder="Facoltativo se SDI" {...campo("pec")} />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full mt-1" disabled={isLoading}>
        {isLoading ? "Salvataggio…" : "Continua al Modulo 2"}
      </Button>
    </form>
  );
}
