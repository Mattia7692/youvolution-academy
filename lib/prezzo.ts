// Aliquota unica per tutti i corsi: nessuna eccezione (es. esenzioni art. 10)
// prevista oggi, quindi una costante invece di una colonna in DB — stesso
// pattern di CONSENSO_VERSIONE_CORRENTE in lib/consenso.ts.
export const ALIQUOTA_IVA = 22;

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

export function formattaDataOra(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formattaOra(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
