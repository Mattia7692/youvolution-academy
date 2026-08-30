import Link from "next/link";
import { AvatarIniziali } from "@/components/avatar-iniziali";
import { RoleBadge } from "@/components/role-badge";
import type { Ruolo } from "@/lib/roles";

export type Utente = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: Ruolo;
  azienda: string | null;
  ruoloAziendale: string | null;
  corsiCount: number;
  ultimoAnno: number | null;
  richiestaCancellazionePendente?: boolean;
};

// Griglia CSS invece di <table>: la riga intera e' un unico link cliccabile
// (serve un <a> che avvolge le "celle"), cosa che una <table> vera non
// permette senza annidare markup non valido (<a> non puo' contenere <td>).
export const COLONNE_TABELLA_UTENTI = "grid-cols-[minmax(0,2.5fr)_minmax(0,1.5fr)_80px_80px_110px]";

export function UtenteRiga({ utente, isSelf }: { utente: Utente; isSelf: boolean }) {
  return (
    <Link
      href={`/admin/utenti/${utente.id}`}
      className={`grid ${COLONNE_TABELLA_UTENTI} items-center gap-3 px-4 py-3 border-b border-border hover:bg-accent/50 transition-colors`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <AvatarIniziali nome={utente.nome} cognome={utente.cognome} size={36} />
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">
            {utente.nome} {utente.cognome}
            {isSelf && <span className="text-muted-foreground font-normal"> (tu)</span>}
          </p>
          <p className="text-sm text-muted-foreground truncate">{utente.email}</p>
          {utente.richiestaCancellazionePendente && (
            <span className="inline-flex items-center rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-medium mt-1">
              Cancellazione richiesta
            </span>
          )}
        </div>
      </div>
      <div className="text-sm min-w-0">
        {utente.azienda ? (
          <>
            <p className="text-foreground truncate">{utente.azienda}</p>
            {utente.ruoloAziendale && <p className="text-muted-foreground truncate">{utente.ruoloAziendale}</p>}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      <div className="text-sm text-foreground text-center">{utente.corsiCount || "—"}</div>
      <div className="text-sm text-foreground text-center">{utente.ultimoAnno ?? "—"}</div>
      <div className="flex justify-end">
        <RoleBadge ruolo={utente.ruolo} />
      </div>
    </Link>
  );
}
