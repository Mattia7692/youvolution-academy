// Opzioni del menu "Numero di utilizzi" per un codice sconto.
//
// Unico punto da toccare per aggiungere/togliere valori suggeriti. Per un
// domani "numero personalizzato" basta aggiungere qui una voce con
// chiave "custom" e gestirla nel form (un <Input type="number"> condizionale)
// + in parseValoreMaxUtilizzi: la struttura del menu non cambia.
export type OpzioneMaxUtilizzi = {
  chiave: string; // value della <option>
  etichetta: string;
  maxUtilizzi: number | null; // null = illimitato
};

export const CHIAVE_ILLIMITATO = "illimitato";

export const OPZIONI_MAX_UTILIZZI: OpzioneMaxUtilizzi[] = [
  { chiave: "1", etichetta: "1 utilizzo", maxUtilizzi: 1 },
  { chiave: "2", etichetta: "2 utilizzi", maxUtilizzi: 2 },
  { chiave: "3", etichetta: "3 utilizzi", maxUtilizzi: 3 },
  { chiave: "4", etichetta: "4 utilizzi", maxUtilizzi: 4 },
  { chiave: "5", etichetta: "5 utilizzi", maxUtilizzi: 5 },
  { chiave: "10", etichetta: "10 utilizzi", maxUtilizzi: 10 },
  { chiave: "20", etichetta: "20 utilizzi", maxUtilizzi: 20 },
  { chiave: CHIAVE_ILLIMITATO, etichetta: "Illimitato (∞)", maxUtilizzi: null },
];

// Valore salvato (number | null) -> chiave della <option>. Un numero fuori
// elenco (impostato via SQL o da una futura opzione custom) torna com'e' in
// stringa: sta al form aggiungere l'opzione sintetica corrispondente.
export function chiavePerMaxUtilizzi(maxUtilizzi: number | null): string {
  if (maxUtilizzi === null) return CHIAVE_ILLIMITATO;
  const opzione = OPZIONI_MAX_UTILIZZI.find((o) => o.maxUtilizzi === maxUtilizzi);
  return opzione ? opzione.chiave : String(maxUtilizzi);
}

// Chiave della <option> -> valore da salvare (number >= 1, oppure null =
// illimitato).
export function parseValoreMaxUtilizzi(chiave: string): number | null {
  const opzione = OPZIONI_MAX_UTILIZZI.find((o) => o.chiave === chiave);
  if (opzione) return opzione.maxUtilizzi;
  const n = Number(chiave);
  return Number.isInteger(n) && n >= 1 ? n : null;
}
