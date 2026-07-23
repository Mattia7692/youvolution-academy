"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  salvaPasso1,
  type DatiFatturazione,
  type DatiFiscali,
} from "@/app/(autenticato)/iscrizione/actions";
import { createClient } from "@/lib/supabase/client";
import {
  ALIQUOTA_IVA,
  EARLY_BIRD_PERCENTUALE,
  formattaData,
  formattaPrezzo,
  scadenzaEarlyBird,
  scomponiPrezzo,
} from "@/lib/prezzo";
import {
  CONSENSO_CONDIZIONI_ISCRIZIONE_VERSIONE_CORRENTE,
  CONSENSO_PRIVACY_ISCRIZIONE_VERSIONE_CORRENTE,
} from "@/lib/consenso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type ModuloDisponibile = {
  id: string;
  titolo: string;
  imponibile: number;
  scadenza_iscrizione: string;
  data_inizio: string;
};

export type PacchettoDisponibile = {
  id: string;
  titolo: string;
  imponibile: number;
  scadenza_iscrizione: string;
  moduloIds: string[];
};

const FISCALI_VUOTI: DatiFiscali = {
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
  cellulare: "",
  data_nascita: "",
};

const FATTURAZIONE_VUOTA: DatiFatturazione = {
  diversa: false,
  intestazione: "",
  indirizzo: "",
  cap: "",
  codice_fiscale_piva: "",
  codice_sdi: "",
};

const oggiISO = () => new Date().toISOString().slice(0, 10);

export function Passo1Form({
  corsoId,
  moduli,
  pacchetti,
}: {
  corsoId: string;
  moduli: ModuloDisponibile[];
  pacchetti: PacchettoDisponibile[];
}) {
  const router = useRouter();
  const oggi = oggiISO();

  // L'early bird e' derivato per l'intero corso — 16 giorni prima della data
  // di inizio del suo primo modulo — non dipende da quali moduli il
  // corsista sceglie di acquistare in questa iscrizione.
  const cutoffEarlyBird = useMemo(
    () => scadenzaEarlyBird(moduli.map((m) => m.data_inizio)),
    [moduli],
  );
  const earlyBirdAttivo = !!cutoffEarlyBird && oggi <= cutoffEarlyBird;

  const [moduloIdsSelezionati, setModuloIdsSelezionati] = useState<string[]>([]);
  const [pacchettoSelezionato, setPacchettoSelezionato] = useState<string | null>(null);

  const [fiscali, setFiscali] = useState<DatiFiscali>(FISCALI_VUOTI);
  const [fatturazione, setFatturazione] = useState<DatiFatturazione>(FATTURAZIONE_VUOTA);

  const [codiceSconto, setCodiceSconto] = useState("");
  const [codiceStato, setCodiceStato] = useState<
    { tipo: "ok"; percentuale: number } | { tipo: "errore" } | null
  >(null);
  const [verificandoCodice, setVerificandoCodice] = useState(false);

  const [consensoCondizioni, setConsensoCondizioni] = useState(false);
  const [consensoPrivacy, setConsensoPrivacy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const campo = (chiave: keyof DatiFiscali) => ({
    value: fiscali[chiave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setFiscali((prev) => ({ ...prev, [chiave]: e.target.value })),
  });

  const campoFatturazione = (chiave: keyof DatiFatturazione) => ({
    value: fatturazione[chiave] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setFatturazione((prev) => ({ ...prev, [chiave]: e.target.value })),
  });

  const toggleModulo = (moduloId: string) => {
    setPacchettoSelezionato(null);
    setModuloIdsSelezionati((prev) =>
      prev.includes(moduloId) ? prev.filter((id) => id !== moduloId) : [...prev, moduloId],
    );
  };

  const selezionaPacchetto = (pacchettoId: string | null) => {
    setPacchettoSelezionato(pacchettoId);
    if (pacchettoId) setModuloIdsSelezionati([]);
  };

  const righeSelezionate = useMemo(() => {
    if (pacchettoSelezionato) {
      const pacchetto = pacchetti.find((p) => p.id === pacchettoSelezionato);
      return pacchetto ? [{ titolo: pacchetto.titolo, imponibile: pacchetto.imponibile }] : [];
    }
    return moduli
      .filter((m) => moduloIdsSelezionati.includes(m.id))
      .map((m) => ({ titolo: m.titolo, imponibile: m.imponibile }));
  }, [pacchettoSelezionato, pacchetti, moduli, moduloIdsSelezionati]);

  const imponibile = righeSelezionate.reduce((somma, r) => somma + r.imponibile, 0);

  const scontoPercentuale =
    codiceStato?.tipo === "ok" ? codiceStato.percentuale : earlyBirdAttivo ? EARLY_BIRD_PERCENTUALE : 0;
  const scontoEtichetta =
    codiceStato?.tipo === "ok"
      ? `Codice ${codiceSconto.trim().toUpperCase()} (-${codiceStato.percentuale}%)`
      : earlyBirdAttivo
        ? `Early bird (-${EARLY_BIRD_PERCENTUALE}%)`
        : null;

  const prezzo = scomponiPrezzo(imponibile, scontoPercentuale);

  const handleVerificaCodice = async () => {
    const codice = codiceSconto.trim();
    if (!codice) {
      setCodiceStato(null);
      return;
    }
    setVerificandoCodice(true);
    const supabase = createClient();
    const { data: percentuale } = await supabase.rpc("valida_codice_sconto", {
      p_codice: codice,
      p_corso_id: corsoId,
    });
    setVerificandoCodice(false);
    setCodiceStato(percentuale ? { tipo: "ok", percentuale } : { tipo: "errore" });
  };

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

    if (righeSelezionate.length === 0) {
      setError("Seleziona almeno un modulo.");
      return;
    }
    if (!consensoCondizioni || !consensoPrivacy) {
      setError("Devi accettare entrambi i consensi per proseguire.");
      return;
    }

    setIsLoading(true);
    const risultato = await salvaPasso1(corsoId, {
      selezione: pacchettoSelezionato
        ? { tipo: "pacchetto", pacchettoId: pacchettoSelezionato }
        : { tipo: "moduli", moduloIds: moduloIdsSelezionati },
      fiscali,
      fatturazione,
      codiceSconto,
      consensoCondizioni,
      consensoPrivacy,
    });
    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }

    router.push(`/iscrizione/${corsoId}/passo-2`);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-[1fr_320px] items-start">
      <div className="flex flex-col gap-5">
        {moduli.length > 1 && (
          <div className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-3">
            <div>
              <h2 className="font-medium text-foreground">Moduli</h2>
              <p className="text-sm text-muted-foreground">
                Seleziona i moduli a cui iscriverti, oppure scegli il pacchetto completo.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {moduli.map((modulo) => {
                const selezionato = pacchettoSelezionato
                  ? false
                  : moduloIdsSelezionati.includes(modulo.id);
                return (
                  <label
                    key={modulo.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      selezionato ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <Checkbox
                      checked={selezionato}
                      disabled={!!pacchettoSelezionato}
                      onCheckedChange={() => toggleModulo(modulo.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{modulo.titolo}</span>
                        <span className="text-sm font-semibold">{formattaPrezzo(modulo.imponibile)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Inizia il {formattaData(modulo.data_inizio)} · iscrizioni entro il{" "}
                        {formattaData(modulo.scadenza_iscrizione)}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {pacchetti.map((pacchetto) => (
              <label
                key={pacchetto.id}
                className={`flex items-start gap-3 rounded-lg border-2 border-dashed p-3 cursor-pointer transition-colors ${
                  pacchettoSelezionato === pacchetto.id
                    ? "border-primary bg-primary/5"
                    : "border-primary/40"
                }`}
              >
                <Checkbox
                  checked={pacchettoSelezionato === pacchetto.id}
                  onCheckedChange={() =>
                    selezionaPacchetto(pacchettoSelezionato === pacchetto.id ? null : pacchetto.id)
                  }
                />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{pacchetto.titolo}</span>
                    <span className="text-sm font-semibold">{formattaPrezzo(pacchetto.imponibile)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Iscrizioni entro il {formattaData(pacchetto.scadenza_iscrizione)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-5">
          <div>
            <h2 className="font-medium text-foreground">Dati del partecipante</h2>
          </div>

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
                <RadioGroupItem value="privato" id="tipo-privato" />
                <Label htmlFor="tipo-privato" className="font-normal">Privato</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="libero_professionista" id="tipo-libero-professionista" />
                <Label htmlFor="tipo-libero-professionista" className="font-normal">
                  Libero professionista
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="azienda" id="tipo-azienda" />
                <Label htmlFor="tipo-azienda" className="font-normal">Azienda</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ragione_sociale">{etichettaRagioneSociale}</Label>
              <Input id="ragione_sociale" required {...campo("ragione_sociale")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cellulare">Cellulare</Label>
              <Input id="cellulare" required {...campo("cellulare")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="codice_fiscale">Codice fiscale</Label>
              <Input id="codice_fiscale" required {...campo("codice_fiscale")} />
            </div>
            {richiedePartitaIva && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partita_iva">Partita IVA</Label>
                <Input id="partita_iva" required {...campo("partita_iva")} />
              </div>
            )}
            {!richiedePartitaIva && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="data_nascita">Data di nascita</Label>
                <Input id="data_nascita" type="date" required {...campo("data_nascita")} />
              </div>
            )}
          </div>
          {richiedePartitaIva && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="data_nascita">Data di nascita</Label>
              <Input id="data_nascita" type="date" required {...campo("data_nascita")} />
            </div>
          )}

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
        </div>

        <div className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <h2 className="font-medium text-foreground">Fatturazione a soggetto diverso</h2>
              <p className="text-sm text-muted-foreground">
                Attiva solo se la fattura va intestata a qualcun altro rispetto al partecipante.
              </p>
            </div>
            <Checkbox
              checked={fatturazione.diversa}
              onCheckedChange={(v) => setFatturazione((prev) => ({ ...prev, diversa: v === true }))}
            />
          </label>

          {fatturazione.diversa && (
            <div className="flex flex-col gap-4 pt-4 border-t border-dashed border-border">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fatt_intestazione">Intestazione</Label>
                  <Input id="fatt_intestazione" required {...campoFatturazione("intestazione")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fatt_cf_piva">Codice fiscale / P. IVA</Label>
                  <Input id="fatt_cf_piva" required {...campoFatturazione("codice_fiscale_piva")} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fatt_indirizzo">Indirizzo</Label>
                  <Input id="fatt_indirizzo" required {...campoFatturazione("indirizzo")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fatt_cap">CAP</Label>
                  <Input id="fatt_cap" required {...campoFatturazione("cap")} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fatt_sdi">Codice destinatario (SDI)</Label>
                <Input id="fatt_sdi" {...campoFatturazione("codice_sdi")} />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-3">
          <div>
            <h2 className="font-medium text-foreground">Codice sconto</h2>
            <p className="text-sm text-muted-foreground">
              Se hai ricevuto un codice promozionale, inseriscilo qui. Non cumulabile con l&apos;early bird.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={codiceSconto}
              onChange={(e) => {
                setCodiceSconto(e.target.value);
                setCodiceStato(null);
              }}
              placeholder="Es. FUTURE15"
            />
            <Button type="button" variant="outline" onClick={handleVerificaCodice} disabled={verificandoCodice}>
              {verificandoCodice ? "Verifica…" : "Applica"}
            </Button>
          </div>
          {codiceStato?.tipo === "ok" && (
            <p className="text-sm text-emerald-700">
              ✓ Codice valido — sconto del {codiceStato.percentuale}% applicato
            </p>
          )}
          {codiceStato?.tipo === "errore" && (
            <p className="text-sm text-destructive">✕ Codice non valido o scaduto</p>
          )}
          {!codiceStato && earlyBirdAttivo && (
            <p className="text-sm text-emerald-700">
              ✓ Early bird attivo fino al {formattaData(cutoffEarlyBird!)}: -{EARLY_BIRD_PERCENTUALE}% applicato
              automaticamente
            </p>
          )}
          {!codiceStato && !earlyBirdAttivo && cutoffEarlyBird && (
            <p className="text-xs text-muted-foreground">
              Early bird scaduto il {formattaData(cutoffEarlyBird)}.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Gli sconti non sono cumulabili: si applica sempre e solo uno tra codice ed early bird.
          </p>
        </div>

        <div className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-4">
          <h2 className="font-medium text-foreground">Consensi</h2>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={consensoCondizioni} onCheckedChange={(v) => setConsensoCondizioni(v === true)} />
            <span className="text-sm text-muted-foreground">
              Ho letto e accetto le condizioni contrattuali, inclusa la limitazione di responsabilità.
              <br />
              <span className="text-xs">
                Versione {CONSENSO_CONDIZIONI_ISCRIZIONE_VERSIONE_CORRENTE} — verrà registrata con data e ora
                dell&apos;accettazione.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={consensoPrivacy} onCheckedChange={(v) => setConsensoPrivacy(v === true)} />
            <span className="text-sm text-muted-foreground">
              Ho letto l&apos;informativa privacy e acconsento al trattamento dei miei dati personali per le
              finalità del corso.
              <br />
              <span className="text-xs">
                Versione {CONSENSO_PRIVACY_ISCRIZIONE_VERSIONE_CORRENTE} — verrà registrata con data e ora
                dell&apos;accettazione.
              </span>
            </span>
          </label>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      <aside className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-2 md:sticky md:top-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Riepilogo
        </h2>
        {righeSelezionate.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Seleziona almeno un modulo per vedere il prezzo
          </p>
        ) : (
          <>
            {righeSelezionate.map((riga, i) => (
              <div key={i} className="flex justify-between text-sm text-muted-foreground">
                <span>{riga.titolo}</span>
                <span>{formattaPrezzo(riga.imponibile)}</span>
              </div>
            ))}
            <hr className="border-border my-2" />
            <div className="flex justify-between text-sm">
              <span>Imponibile</span>
              <span className="font-medium">{formattaPrezzo(prezzo.imponibile)}</span>
            </div>
            {scontoPercentuale > 0 && (
              <div className="flex justify-between text-sm text-emerald-700">
                <span>{scontoEtichetta}</span>
                <span>− {formattaPrezzo(prezzo.scontoImporto)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>IVA {ALIQUOTA_IVA}%</span>
              <span>{formattaPrezzo(prezzo.iva)}</span>
            </div>
            <hr className="border-border my-2" />
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold">Totale</span>
              <span className="text-2xl font-bold">{formattaPrezzo(prezzo.totale)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Importo congelato al momento dell&apos;invio.
            </p>
          </>
        )}

        <Button type="submit" className="w-full mt-3" disabled={isLoading}>
          {isLoading ? "Salvataggio…" : "Prosegui al pagamento"}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Servono entrambi i consensi per proseguire
        </p>
      </aside>
    </form>
  );
}
