// Aliquota unica per tutti i corsi: nessuna eccezione (es. esenzioni art. 10)
// prevista oggi, quindi una costante invece di una colonna in DB — stesso
// pattern di CONSENSO_VERSIONE_CORRENTE in lib/consenso.ts.
export const ALIQUOTA_IVA = 22;

// Sconto early bird: percentuale fissa, applicata automaticamente (mai a
// scelta del corsista). Non cumulabile con un codice sconto.
export const EARLY_BIRD_PERCENTUALE = 10;

// La scadenza early bird non e' una data configurata a mano: e' sempre
// derivata come N giorni prima della data di inizio del PRIMO modulo del
// corso (quello con data_inizio piu' vicina) — vale per l'intero corso,
// indipendentemente da quali moduli il corsista scelga di acquistare.
export const EARLY_BIRD_GIORNI_PRIMA = 16;

// Calcola la scadenza early bird di un corso a partire dalle date di inizio
// (yyyy-mm-dd) di tutti i suoi moduli attivi. Ritorna null se non ci sono
// moduli (corso non ancora configurato).
export function scadenzaEarlyBird(dateInizioModuli: string[]): string | null {
  if (dateInizioModuli.length === 0) return null;
  const primaData = dateInizioModuli.reduce((min, d) => (d < min ? d : min));
  const scadenza = new Date(`${primaData}T00:00:00`);
  scadenza.setDate(scadenza.getDate() - EARLY_BIRD_GIORNI_PRIMA);
  return scadenza.toISOString().slice(0, 10);
}

export type ScomposizionePrezzo = {
  imponibile: number;
  scontoPercentuale: number;
  scontoImporto: number;
  imponibileScontato: number;
  iva: number;
  totale: number;
};

export function scomponiPrezzo(imponibile: number, scontoPercentuale: number): ScomposizionePrezzo {
  const scontoImporto = (imponibile * scontoPercentuale) / 100;
  const imponibileScontato = imponibile - scontoImporto;
  const iva = (imponibileScontato * ALIQUOTA_IVA) / 100;
  const totale = imponibileScontato + iva;
  return { imponibile, scontoPercentuale, scontoImporto, imponibileScontato, iva, totale };
}

export function formattaPrezzo(valore: number | null | undefined) {
  if (valore === null || valore === undefined) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(valore);
}

export function formattaData(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${iso}T00:00:00`),
  );
}
