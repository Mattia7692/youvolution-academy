"use server";

import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { revalidatePath } from "next/cache";

export async function verificaIscrizione(iscrizioneId: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { error } = await supabase
    .from("iscrizioni")
    .update({
      stato: "verificata",
      verificata_da: admin.id,
      verificata_at: new Date().toISOString(),
      nota_admin: null,
    })
    .eq("id", iscrizioneId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/coda-verifica");
  return { ok: true as const };
}

export type DatiCorso = {
  titolo: string;
  descrizione: string;
  prezzo: number;
  attivo: boolean;
};

export async function creaCorso(dati: DatiCorso) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const titolo = dati.titolo.trim();
  if (!titolo) return { ok: false as const, error: "Il titolo è obbligatorio." };
  if (!(dati.prezzo >= 0)) return { ok: false as const, error: "Prezzo non valido." };

  const { error } = await supabase.from("corsi").insert({
    titolo,
    descrizione: dati.descrizione.trim() || null,
    prezzo: dati.prezzo,
    attivo: dati.attivo,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/corsi");
  revalidatePath("/catalogo");
  return { ok: true as const };
}

export async function aggiornaCorso(
  corsoId: string,
  patch: Partial<DatiCorso>,
) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const aggiornamento: Record<string, unknown> = {};
  if (patch.titolo !== undefined) aggiornamento.titolo = patch.titolo.trim();
  if (patch.descrizione !== undefined) aggiornamento.descrizione = patch.descrizione.trim() || null;
  if (patch.prezzo !== undefined) aggiornamento.prezzo = patch.prezzo;
  if (patch.attivo !== undefined) aggiornamento.attivo = patch.attivo;

  const { error } = await supabase
    .from("corsi")
    .update(aggiornamento)
    .eq("id", corsoId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/corsi");
  revalidatePath("/catalogo");
  return { ok: true as const };
}

export async function segnalaIscrizione(iscrizioneId: string, nota: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const notaPulita = nota.trim();
  if (!notaPulita) {
    return { ok: false as const, error: "Indica il motivo della segnalazione." };
  }

  const { error } = await supabase
    .from("iscrizioni")
    .update({
      stato: "cro_da_chiarire",
      verificata_da: admin.id,
      verificata_at: new Date().toISOString(),
      nota_admin: notaPulita,
    })
    .eq("id", iscrizioneId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/coda-verifica");
  return { ok: true as const };
}
