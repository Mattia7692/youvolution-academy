import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin, normalizzaRuolo } from "@/lib/roles";
import { UtentiLista } from "@/components/utenti-lista";
import { StatTile } from "@/components/stat-tile";
import { IscrizioniAnnoChart, type IscrizioniAnno } from "@/components/iscrizioni-anno-chart";

export default async function GestioneUtentiPage() {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) redirect("/");

  let query = supabase
    .from("profiles")
    .select("id, nome, cognome, email, ruolo, created_at, azienda, ruolo_aziendale")
    .order("created_at", { ascending: false });

  // Un admin semplice non vede nemmeno l'esistenza degli owner in lista
  // (solo un owner vede altri owner) — coerente con la barriera gia' a
  // livello di RLS/trigger sul ruolo.
  if (admin.ruolo !== "owner") {
    query = query.neq("ruolo", "owner");
  }

  const [{ data: profili }, { data: richiestePendenti }, { data: iscrizioniVerificate }] = await Promise.all([
    query,
    supabase.from("richieste_cancellazione").select("profilo_id").eq("stato", "in_attesa"),
    supabase.from("iscrizioni").select("corsista_id, verificata_at").eq("stato", "verificata"),
  ]);

  const profiliConRichiesta = new Set((richiestePendenti ?? []).map((r) => r.profilo_id));

  // Per ogni corsista: quante iscrizioni verificate ha e l'anno dell'ultima —
  // usato sia per la colonna CORSI/ULTIMO della tabella sia per la tile
  // "Con iscrizione attiva" e il grafico, cosi' i tre numeri restano
  // coerenti fra loro perche' vengono dalla stessa query.
  const perCorsista = new Map<string, { count: number; ultimoAnno: number }>();
  const perAnno = new Map<string, Set<string>>();
  for (const iscrizione of iscrizioniVerificate ?? []) {
    if (!iscrizione.verificata_at) continue;
    const anno = new Date(iscrizione.verificata_at).getFullYear();

    const attuale = perCorsista.get(iscrizione.corsista_id);
    perCorsista.set(iscrizione.corsista_id, {
      count: (attuale?.count ?? 0) + 1,
      ultimoAnno: Math.max(attuale?.ultimoAnno ?? 0, anno),
    });

    const annoKey = String(anno);
    if (!perAnno.has(annoKey)) perAnno.set(annoKey, new Set());
    perAnno.get(annoKey)!.add(iscrizione.corsista_id);
  }

  const datiGrafico: IscrizioniAnno[] = Array.from(perAnno.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([anno, corsisti]) => ({ anno, corsisti: corsisti.size }));

  const profiliCorsisti = (profili ?? []).filter((p) => normalizzaRuolo(p.ruolo) === "corsista");
  const trentaGiorniFa = new Date();
  trentaGiorniFa.setDate(trentaGiorniFa.getDate() - 30);

  const corsistiTotali = profiliCorsisti.length;
  const nuovi30gg = profiliCorsisti.filter((p) => new Date(p.created_at) >= trentaGiorniFa).length;
  const conIscrizioneAttiva = perCorsista.size;
  const staffCount = (profili ?? []).length - profiliCorsisti.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Gestione utenti</h1>
        <p className="text-muted-foreground mt-1">
          Anagrafica corsisti e ruoli. Clicca un nome per la scheda completa.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
        <StatTile label="Corsisti totali" value={corsistiTotali} />
        <StatTile label="Nuovi (30 giorni)" value={`+${nuovi30gg}`} evidenzia />
        <StatTile label="Con iscrizione attiva" value={conIscrizioneAttiva} />
        <StatTile label="Staff (admin/owner)" value={staffCount} />
      </div>

      {datiGrafico.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-xl p-6">
          <h2 className="font-medium text-foreground">Iscrizioni per anno</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Corsisti che hanno completato almeno un&apos;iscrizione
          </p>
          <IscrizioniAnnoChart dati={datiGrafico} />
        </div>
      )}

      {!profili || profili.length === 0 ? (
        <p className="text-muted-foreground">Nessun utente registrato ancora.</p>
      ) : (
        <UtentiLista
          adminId={admin.id}
          utenti={profili.map((profilo) => ({
            id: profilo.id,
            nome: profilo.nome,
            cognome: profilo.cognome,
            email: profilo.email,
            ruolo: normalizzaRuolo(profilo.ruolo),
            azienda: profilo.azienda,
            ruoloAziendale: profilo.ruolo_aziendale,
            corsiCount: perCorsista.get(profilo.id)?.count ?? 0,
            ultimoAnno: perCorsista.get(profilo.id)?.ultimoAnno ?? null,
            richiestaCancellazionePendente: profiliConRichiesta.has(profilo.id),
          }))}
        />
      )}
    </div>
  );
}
