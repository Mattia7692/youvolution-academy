import { StatoBadge, type StatoIscrizione } from "@/components/stato-badge";
import { formattaPrezzo } from "@/lib/prezzo";

type ScontoTipo = "nessuno" | "early_bird" | "first_mover" | "codice";

const ETICHETTA_SCONTO: Record<ScontoTipo, string> = {
  nessuno: "Nessuno",
  early_bird: "Early bird",
  first_mover: "First mover",
  codice: "Codice",
};

const STILE_SCONTO: Record<ScontoTipo, string> = {
  nessuno: "bg-muted text-muted-foreground",
  early_bird: "bg-amber-50 text-amber-700",
  first_mover: "bg-violet-50 text-violet-700",
  codice: "bg-blue-50 text-blue-700",
};

export type StoricoCorso = {
  id: string;
  stato: StatoIscrizione;
  createdAt: string;
  totaleSnapshot: number | null;
  scontoTipo: ScontoTipo | null;
  scontoPercentuale: number | null;
  codiceScontoInserito: string | null;
  corsoTitolo: string | null;
  pacchettoTitolo: string | null;
  moduliTitoli: string[];
  rate: { numero: number; stato: StatoIscrizione }[];
};

export const COLONNE_TABELLA_STORICO =
  "grid-cols-[minmax(0,2fr)_64px_minmax(0,120px)_minmax(0,160px)_minmax(0,160px)_110px]";

export function StoricoCorsoRiga({ voce }: { voce: StoricoCorso }) {
  const anno = new Date(voce.createdAt).getFullYear();
  const contenuto = voce.pacchettoTitolo ?? (voce.moduliTitoli.length > 0 ? voce.moduliTitoli.join(", ") : null);
  const rateVerificate = voce.rate.filter((r) => r.stato === "verificata").length;
  const sconto = voce.scontoTipo ?? "nessuno";

  return (
    <div
      className={`grid ${COLONNE_TABELLA_STORICO} items-center gap-3 px-4 py-3 border-b border-border last:border-b-0`}
    >
      <div className="min-w-0">
        <p className="text-foreground truncate">{voce.corsoTitolo ?? "Corso"}</p>
        {contenuto && <p className="text-xs text-muted-foreground truncate">{contenuto}</p>}
      </div>
      <div className="text-sm text-muted-foreground">{anno}</div>
      <div className="text-sm text-muted-foreground">
        {voce.rate.length > 0 ? `Rate (${rateVerificate}/${voce.rate.length})` : "Bonifico"}
      </div>
      <div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STILE_SCONTO[sconto]}`}
        >
          {ETICHETTA_SCONTO[sconto]}
          {sconto !== "nessuno" && voce.scontoPercentuale !== null && ` -${voce.scontoPercentuale}%`}
          {sconto === "codice" && voce.codiceScontoInserito && ` · ${voce.codiceScontoInserito}`}
        </span>
      </div>
      <div>
        <StatoBadge stato={voce.stato} />
      </div>
      <div className="text-sm text-foreground font-medium text-right tabular-nums whitespace-nowrap">
        {formattaPrezzo(voce.totaleSnapshot)}
      </div>
    </div>
  );
}
