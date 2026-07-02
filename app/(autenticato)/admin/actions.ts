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
  revalidatePath("/admin/corsi", "layout");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export type DatiCorso = {
  titolo: string;
  descrizione: string;
  calendario: string;
  prezzo: number | null;
  attivo: boolean;
  posti_disponibili: number | null;
};

export async function creaCorso(dati: DatiCorso) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const titolo = dati.titolo.trim();
  if (!titolo) return { ok: false as const, error: "Il titolo è obbligatorio." };
  if (dati.prezzo !== null && !(dati.prezzo >= 0)) {
    return { ok: false as const, error: "Prezzo non valido." };
  }
  if (dati.posti_disponibili !== null && !(dati.posti_disponibili >= 0)) {
    return { ok: false as const, error: "Numero di posti non valido." };
  }

  const { error } = await supabase.from("corsi").insert({
    titolo,
    descrizione: dati.descrizione.trim() || null,
    calendario: dati.calendario.trim() || null,
    prezzo: dati.prezzo,
    attivo: dati.attivo,
    posti_disponibili: dati.posti_disponibili,
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

  // Un corso senza prezzo non puo' diventare visibile ai corsisti: la bozza
  // importata deve prima passare dalla revisione (prezzo incluso).
  if (patch.attivo === true) {
    const prezzoFinale =
      patch.prezzo !== undefined
        ? patch.prezzo
        : (await supabase.from("corsi").select("prezzo").eq("id", corsoId).maybeSingle()).data
            ?.prezzo;

    if (prezzoFinale === null || prezzoFinale === undefined) {
      return {
        ok: false as const,
        error: "Imposta un prezzo prima di rendere il corso visibile ai corsisti.",
      };
    }
  }

  const aggiornamento: Record<string, unknown> = {};
  if (patch.titolo !== undefined) aggiornamento.titolo = patch.titolo.trim();
  if (patch.descrizione !== undefined) aggiornamento.descrizione = patch.descrizione.trim() || null;
  if (patch.calendario !== undefined) aggiornamento.calendario = patch.calendario.trim() || null;
  if (patch.prezzo !== undefined) aggiornamento.prezzo = patch.prezzo;
  if (patch.attivo !== undefined) aggiornamento.attivo = patch.attivo;
  if (patch.posti_disponibili !== undefined) aggiornamento.posti_disponibili = patch.posti_disponibili;

  const { error } = await supabase
    .from("corsi")
    .update(aggiornamento)
    .eq("id", corsoId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/corsi");
  revalidatePath("/catalogo");
  return { ok: true as const };
}

export async function eliminaCorso(corsoId: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { error } = await supabase.from("corsi").delete().eq("id", corsoId);

  if (error) {
    // iscrizioni.corso_id non ha ON DELETE CASCADE: se esiste anche una sola
    // iscrizione (di qualunque stato, comprese quelle storiche) collegata a
    // questo corso, il database rifiuta la cancellazione con l'errore
    // Postgres 23503 (foreign_key_violation), a protezione dello storico
    // iscrizioni/pagamenti. In quel caso l'unica strada e' disattivare il
    // corso, non eliminarlo.
    if (error.code === "23503") {
      return {
        ok: false as const,
        error:
          "Non puoi eliminare questo corso: ci sono iscrizioni collegate (anche storiche). Disattivalo invece, per nasconderlo dal catalogo senza perdere lo storico.",
      };
    }
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/admin/corsi");
  revalidatePath("/catalogo");
  return { ok: true as const };
}

export async function eliminaIscrizione(iscrizioneId: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { error } = await supabase.from("iscrizioni").delete().eq("id", iscrizioneId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/corsi", "layout");
  revalidatePath("/admin/coda-verifica");
  revalidatePath("/admin/prenotazioni");
  revalidatePath("/", "layout");
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
  revalidatePath("/admin/corsi", "layout");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
