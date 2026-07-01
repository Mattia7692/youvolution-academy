import { cn } from "@/lib/utils";

export type StatoIscrizione =
  | "bozza"
  | "in_attesa_pagamento"
  | "cro_inserito"
  | "verificata"
  | "cro_da_chiarire";

const ETICHETTE: Record<StatoIscrizione, string> = {
  bozza: "Bozza",
  in_attesa_pagamento: "In attesa di pagamento",
  cro_inserito: "CRO inserito",
  verificata: "Verificata",
  cro_da_chiarire: "CRO da chiarire",
};

const COLORI: Record<StatoIscrizione, string> = {
  bozza: "bg-muted text-muted-foreground",
  in_attesa_pagamento: "bg-amber-50 text-amber-700",
  cro_inserito: "bg-blue-50 text-blue-700",
  verificata: "bg-emerald-50 text-emerald-700",
  cro_da_chiarire: "bg-red-50 text-red-700",
};

export function StatoBadge({ stato }: { stato: StatoIscrizione }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        COLORI[stato],
      )}
    >
      {ETICHETTE[stato]}
    </span>
  );
}
