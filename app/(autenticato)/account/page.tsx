import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/account-form";
import { EsportaDatiButton } from "@/components/esporta-dati-button";
import { RichiediCancellazioneForm } from "@/components/richiedi-cancellazione-form";
import type { DatiFatturazione, DatiFiscali } from "@/app/(autenticato)/iscrizione/actions";
import type { DatiAzienda } from "@/app/(autenticato)/account/actions";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profilo } = await supabase
    .from("profiles")
    .select(
      "nome, cognome, email, tipo_soggetto, ragione_sociale, codice_fiscale, partita_iva, indirizzo, cap, citta, provincia, nazione, codice_sdi, pec, cellulare, data_nascita, fatturazione_diversa, fatturazione_intestazione, fatturazione_indirizzo, fatturazione_cap, fatturazione_codice_fiscale_piva, fatturazione_codice_sdi, azienda, ruolo_aziendale",
    )
    .eq("id", user.id)
    .maybeSingle();

  const datiIniziali: DatiFiscali = {
    tipo_soggetto: (profilo?.tipo_soggetto as DatiFiscali["tipo_soggetto"]) ?? "privato",
    ragione_sociale: profilo?.ragione_sociale ?? "",
    codice_fiscale: profilo?.codice_fiscale ?? "",
    partita_iva: profilo?.partita_iva ?? "",
    indirizzo: profilo?.indirizzo ?? "",
    cap: profilo?.cap ?? "",
    citta: profilo?.citta ?? "",
    provincia: profilo?.provincia ?? "",
    nazione: profilo?.nazione ?? "IT",
    codice_sdi: profilo?.codice_sdi ?? "",
    pec: profilo?.pec ?? "",
    cellulare: profilo?.cellulare ?? "",
    data_nascita: profilo?.data_nascita ?? "",
  };

  const fatturazioneIniziale: DatiFatturazione = {
    diversa: profilo?.fatturazione_diversa ?? false,
    intestazione: profilo?.fatturazione_intestazione ?? "",
    indirizzo: profilo?.fatturazione_indirizzo ?? "",
    cap: profilo?.fatturazione_cap ?? "",
    codice_fiscale_piva: profilo?.fatturazione_codice_fiscale_piva ?? "",
    codice_sdi: profilo?.fatturazione_codice_sdi ?? "",
  };

  const aziendaIniziale: DatiAzienda = {
    azienda: profilo?.azienda ?? "",
    ruolo_aziendale: profilo?.ruolo_aziendale ?? "",
  };

  const { data: richiestaCancellazione } = await supabase
    .from("richieste_cancellazione")
    .select("id")
    .eq("profilo_id", user.id)
    .eq("stato", "in_attesa")
    .maybeSingle();

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Il mio account</h1>
        <p className="text-muted-foreground mt-1">
          {profilo?.nome} {profilo?.cognome} · {profilo?.email}
        </p>
      </div>
      <AccountForm
        datiIniziali={datiIniziali}
        fatturazioneIniziale={fatturazioneIniziale}
        aziendaIniziale={aziendaIniziale}
      />

      <div className="rounded-xl bg-card border border-border shadow-xl p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-medium text-foreground">I tuoi dati</h2>
          <p className="text-sm text-muted-foreground">
            Ricevi via email una copia di tutti i dati collegati al tuo account.
          </p>
        </div>
        <EsportaDatiButton />
      </div>

      <div className="rounded-xl bg-card border border-destructive/30 shadow-xl p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-medium text-foreground">Cancellazione account</h2>
          <p className="text-sm text-muted-foreground">
            Richiedi la cancellazione dei tuoi dati. La richiesta viene gestita dal nostro team.
          </p>
        </div>
        <RichiediCancellazioneForm richiestaGiaInviata={Boolean(richiestaCancellazione)} />
      </div>
    </div>
  );
}
