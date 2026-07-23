import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { CorsoForm } from "@/components/corso-form";
import { CorsoRiga } from "@/components/corso-riga";
import type { ModuloCorso } from "@/components/modulo-riga";
import type { PacchettoCorso } from "@/components/pacchetto-riga";

export default async function GestioneCorsiPage() {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) redirect("/");

  const [{ data: corsi }, { data: moduli }, { data: pacchetti }, { data: pacchettoModuli }, { data: verificate }] =
    await Promise.all([
      supabase
        .from("corsi")
        .select("id, titolo, descrizione, calendario, attivo")
        .order("created_at", { ascending: false }),
      supabase
        .from("moduli_corso")
        .select(
          "id, corso_id, titolo, imponibile, scadenza_iscrizione, data_inizio, posti_disponibili, iscrizioni_chiuse, attivo",
        ),
      supabase
        .from("pacchetti_corso")
        .select(
          "id, corso_id, titolo, imponibile, scadenza_iscrizione, posti_disponibili, iscrizioni_chiuse, attivo",
        ),
      supabase.from("pacchetto_moduli").select("pacchetto_id, modulo_id"),
      // Contiamo come "iscritti" solo le iscrizioni verificate (pagamento
      // confermato), non le prenotazioni ancora in corso.
      supabase.from("iscrizioni").select("corso_id").eq("stato", "verificata"),
    ]);

  const moduliPerCorso = new Map<string, ModuloCorso[]>();
  for (const m of moduli ?? []) {
    const lista = moduliPerCorso.get(m.corso_id) ?? [];
    lista.push(m);
    moduliPerCorso.set(m.corso_id, lista);
  }

  const moduliIdsPerPacchetto = new Map<string, string[]>();
  for (const riga of pacchettoModuli ?? []) {
    const lista = moduliIdsPerPacchetto.get(riga.pacchetto_id) ?? [];
    lista.push(riga.modulo_id);
    moduliIdsPerPacchetto.set(riga.pacchetto_id, lista);
  }

  const pacchettiPerCorso = new Map<string, PacchettoCorso[]>();
  for (const p of pacchetti ?? []) {
    const lista = pacchettiPerCorso.get(p.corso_id) ?? [];
    lista.push({ ...p, moduloIds: moduliIdsPerPacchetto.get(p.id) ?? [] });
    pacchettiPerCorso.set(p.corso_id, lista);
  }

  const conteggi = new Map<string, number>();
  for (const riga of verificate ?? []) {
    conteggi.set(riga.corso_id, (conteggi.get(riga.corso_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Gestione corsi</h1>
        <p className="text-muted-foreground mt-1">
          Inserisci a mano i corsi disponibili nel catalogo.
        </p>
      </div>

      <CorsoForm />

      <div className="space-y-3">
        {!corsi || corsi.length === 0 ? (
          <p className="text-muted-foreground">Nessun corso creato ancora.</p>
        ) : (
          corsi.map((corso) => (
            <CorsoRiga
              key={corso.id}
              corso={corso}
              moduli={moduliPerCorso.get(corso.id) ?? []}
              pacchetti={pacchettiPerCorso.get(corso.id) ?? []}
              iscritti={conteggi.get(corso.id) ?? 0}
            />
          ))
        )}
      </div>
    </div>
  );
}
