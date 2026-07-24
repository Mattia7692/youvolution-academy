export type MetodoPagamento = "allianz" | "fineco";

export const METODI_PAGAMENTO: Record<
  MetodoPagamento,
  { etichetta: string; beneficiario: string; banca: string; iban: string }
> = {
  allianz: {
    etichetta: "Allianz Bank",
    beneficiario: "YOUVOLUTION SRL SOCIETA' BENEFIT",
    banca: "Allianz Bank",
    iban: "IT84 L035 8901 6000 1057 0950 025",
  },
  fineco: {
    etichetta: "Fineco Bank",
    beneficiario: "YOUVOLUTION SRL",
    banca: "Fineco Bank",
    iban: "IT02 J030 1503 2000 0000 3631 689",
  },
};
