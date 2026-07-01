import type { SupabaseClient } from "@supabase/supabase-js";

// Centralizza qui il concetto di ruolo/profilo, usato da layout, pagine, server
// actions e route handler — a differenza dell'enterprise, dove lo stesso
// normalizeRole()/controllo admin e' duplicato in oltre 5 file.

export type Ruolo = "corsista" | "admin";

export function normalizzaRuolo(valore: unknown): Ruolo {
  return valore === "admin" ? "admin" : "corsista";
}

export type Profilo = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: Ruolo;
};

export async function getProfiloUtente(
  supabase: SupabaseClient,
): Promise<Profilo | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, nome, cognome, email, ruolo")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    nome: data.nome,
    cognome: data.cognome,
    email: data.email,
    ruolo: normalizzaRuolo(data.ruolo),
  };
}

export async function richiediAdmin(
  supabase: SupabaseClient,
): Promise<Profilo | null> {
  const profilo = await getProfiloUtente(supabase);
  if (!profilo || profilo.ruolo !== "admin") return null;
  return profilo;
}
