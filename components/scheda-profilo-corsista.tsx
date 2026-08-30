"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarIniziali } from "@/components/avatar-iniziali";
import { RoleBadge } from "@/components/role-badge";
import { RuoloControlli } from "@/components/ruolo-controlli";
import { DatiCorsistaAdminForm } from "@/components/dati-corsista-admin-form";
import { Button } from "@/components/ui/button";
import { SFONDO_SIDEBAR, TESTO_SIDEBAR, TESTO_SIDEBAR_MUTO } from "@/lib/tema";
import type { Ruolo } from "@/lib/roles";
import type { DatiCorsistaAdmin } from "@/app/(autenticato)/admin/actions";

const ETICHETTA_TIPO_SOGGETTO: Record<DatiCorsistaAdmin["tipo_soggetto"], string> = {
  privato: "Privato",
  azienda: "Azienda",
  libero_professionista: "Libero professionista",
};

export function SchedaProfiloCorsista({
  profiloId,
  nome,
  cognome,
  email,
  cellulare,
  createdAt,
  ruolo,
  isSelf,
  viewerIsOwner,
  datiIniziali,
}: {
  profiloId: string;
  nome: string;
  cognome: string;
  email: string;
  cellulare: string | null;
  createdAt: string;
  ruolo: Ruolo;
  isSelf: boolean;
  viewerIsOwner: boolean;
  datiIniziali: DatiCorsistaAdmin;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  const chiudi = () => {
    setIsEditing(false);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div style={{ background: SFONDO_SIDEBAR, color: TESTO_SIDEBAR }} className="rounded-xl shadow-xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <AvatarIniziali nome={nome} cognome={cognome} size={48} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-white">
                  {nome} {cognome}
                </h1>
                <RoleBadge ruolo={ruolo} size="sm" />
              </div>
              <p style={{ color: TESTO_SIDEBAR_MUTO }} className="text-sm mt-0.5">
                {email}
                {cellulare && ` · ${cellulare}`} · iscritto dal {new Date(createdAt).getFullYear()}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="bg-transparent border-white/25 text-white hover:bg-white/10 shrink-0"
            onClick={() => (isEditing ? chiudi() : setIsEditing(true))}
          >
            {isEditing ? "Annulla" : "Modifica"}
          </Button>
        </div>

        <div className="pt-4 border-t border-dashed border-white/15">
          <RuoloControlli
            utenteId={profiloId}
            ruolo={ruolo}
            isSelf={isSelf}
            viewerIsOwner={viewerIsOwner}
            dark
          />
        </div>
      </div>

      {isEditing ? (
        <div className="rounded-xl bg-card border border-border shadow-xl p-6">
          <DatiCorsistaAdminForm profiloId={profiloId} datiIniziali={datiIniziali} onChiudi={chiudi} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-card border border-border shadow-xl p-5">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Azienda e ruolo
            </h2>
            {datiIniziali.azienda ? (
              <>
                <p className="font-medium text-foreground">{datiIniziali.azienda}</p>
                {datiIniziali.ruolo_aziendale && (
                  <p className="text-sm text-muted-foreground">{datiIniziali.ruolo_aziendale}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">Compilato dal corsista, modificabile</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Non specificata.</p>
            )}
          </div>
          <div className="rounded-xl bg-card border border-border shadow-xl p-5">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Dati fiscali
            </h2>
            <p className="font-medium text-foreground">{ETICHETTA_TIPO_SOGGETTO[datiIniziali.tipo_soggetto]}</p>
            <p className="text-sm text-muted-foreground">
              {[datiIniziali.codice_fiscale, datiIniziali.partita_iva].filter(Boolean).join(" · ") ||
                "Nessun dato fiscale"}
            </p>
            {datiIniziali.indirizzo && (
              <p className="text-sm text-muted-foreground">
                {datiIniziali.indirizzo}
                {datiIniziali.citta && `, ${datiIniziali.citta}`} {datiIniziali.cap}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
