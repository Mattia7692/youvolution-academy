import type { Metadata, Viewport } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Informativa sulla privacy · Youvolution Academy",
  description:
    "Come Youvolution Academy tratta i dati personali di corsisti e utenti.",
};

export const viewport: Viewport = {
  colorScheme: "light",
};

/**
 * Informativa privacy della PIATTAFORMA Youvolution Academy (corsi, iscrizioni,
 * pagamenti a rate, CRM corsista). Documento distinto:
 *  - dall'informativa del sito vetrina youvolution.org (iubenda)
 *  - dall'informativa della piattaforma gestionale enterprise (youvolution-platform)
 *
 * Dati societari da visura/QR-code P.IVA (uguali all'enterprise, stessa società).
 *
 * ⚠️ BOZZA DA VALIDARE LEGALMENTE. Restano da completare/confermare con il
 * consulente (parti tra parentesi quadre [ … ] nel testo):
 *  - conferma sede legale attuale (il QR-code è del 2018) + eventuale PEC / casella privacy@
 *  - nomina o meno di un DPO
 *  - region effettiva di Supabase e Vercel (devono stare in UE) + DPA firmati
 *  - trasferimento USA di Resend: SCC in essere o sostituzione con provider UE
 *  - tempi di conservazione precisi (account, note CRM, log)
 *  - versionamento dei consensi già gestito in app (lib/consenso.ts): allineare i
 *    testi di consenso a questa informativa quando viene validata
 */

const LAST_UPDATED = "6 settembre 2026";
const CONTACT_EMAIL = "privacy@youvolution.org";

const CONTROLLER = {
  name: "Youvolution S.r.l. Società Benefit",
  address: "Via della Vittoria 33, 20025 Legnano (MI), Italia",
  vat: "10167140960",
} as const;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/80">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col">
      {/* Header */}
      <header
        className="px-6 py-8"
        style={{
          background:
            "linear-gradient(160deg, hsl(190 30% 10%) 0%, hsl(190 28% 14%) 45%, hsl(173 35% 16%) 100%)",
        }}
      >
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="inline-block text-lg font-bold tracking-tight text-white"
          >
            Youvolution Academy
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Youvolution Academy
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Informativa sul trattamento dei dati personali
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ultimo aggiornamento: {LAST_UPDATED} · Documento in fase di
              revisione. Per qualsiasi richiesta:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-primary hover:underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
            </p>

            <div className="mt-6 rounded-xl border border-border bg-secondary/50 p-4 text-sm leading-relaxed text-foreground/80">
              Questa informativa riguarda la <strong>piattaforma Youvolution
              Academy</strong>, con cui i corsisti consultano il catalogo dei
              corsi, si iscrivono e gestiscono i pagamenti. È un documento
              distinto dall&apos;informativa del sito{" "}
              <a
                href="https://www.youvolution.org"
                className="text-primary hover:underline underline-offset-4"
                target="_blank"
                rel="noreferrer"
              >
                youvolution.org
              </a>{" "}
              e da quella della piattaforma gestionale interna.
            </div>

            <div className="mt-8 space-y-8">
              <Section id="titolare" title="1. Titolare del trattamento">
                <p>
                  Il titolare del trattamento è <strong>{CONTROLLER.name}</strong>,
                  con sede legale in <strong>{CONTROLLER.address}</strong> — C.F.
                  e Partita IVA <strong>{CONTROLLER.vat}</strong>.
                </p>
                <p>
                  Per ogni questione relativa ai dati personali, e per esercitare
                  i diritti descritti al punto 8, è possibile scrivere a{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="font-medium text-primary hover:underline underline-offset-4"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
                <p>
                  [Youvolution non ha nominato un Responsabile della protezione
                  dei dati (DPO) / il DPO è contattabile all&apos;indirizzo …].
                </p>
              </Section>

              <Section id="dati" title="2. Quali dati trattiamo">
                <p>Attraverso la piattaforma trattiamo:</p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    <strong>Dati dell&apos;account</strong>: nome, cognome,
                    indirizzo email, password (conservata solo in forma cifrata).
                  </li>
                  <li>
                    <strong>Dati anagrafici e fiscali</strong>: codice fiscale,
                    data di nascita, indirizzo di residenza ed eventuali dati di
                    fatturazione a un soggetto diverso (denominazione, C.F./P.IVA,
                    indirizzo), necessari per l&apos;iscrizione ai corsi e per
                    l&apos;emissione dei documenti contabili.
                  </li>
                  <li>
                    <strong>Dati delle iscrizioni</strong>: corsi e moduli scelti,
                    stato dell&apos;iscrizione, consensi prestati (con versione,
                    data e ora), codici sconto utilizzati.
                  </li>
                  <li>
                    <strong>Dati dei pagamenti</strong>: importi, piani di
                    pagamento a rate e relative scadenze, metodo (bonifico
                    bancario), estremi dell&apos;operazione (CRO/data) e{" "}
                    <strong>ricevute o distinte di pagamento</strong> caricate
                    dall&apos;utente come file.
                  </li>
                  <li>
                    <strong>Note amministrative</strong>: annotazioni dello staff
                    sulla posizione del corsista (es. stato dei pagamenti,
                    comunicazioni intercorse).
                  </li>
                  <li>
                    <strong>Dati tecnici e di sicurezza</strong>: registro degli
                    invii delle email, dati di autenticazione e di accesso gestiti
                    dal fornitore di autenticazione (indirizzo IP, marca
                    temporale, identificativi di sessione).
                  </li>
                </ul>
                <p>
                  La piattaforma <strong>non utilizza cookie di profilazione</strong>{" "}
                  né strumenti di analisi statistica di terze parti: sono presenti
                  solo cookie tecnici necessari a mantenere l&apos;utente
                  autenticato.
                </p>
              </Section>

              <Section id="finalita" title="3. Perché trattiamo i dati (finalità e basi giuridiche)">
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    <strong>Gestione dell&apos;account e dell&apos;iscrizione ai
                    corsi</strong> — base giuridica: esecuzione di un contratto o
                    di misure precontrattuali (art. 6.1.b).
                  </li>
                  <li>
                    <strong>Gestione dei pagamenti</strong>, verifica dei bonifici
                    e piani a rate — base giuridica: esecuzione del contratto.
                  </li>
                  <li>
                    <strong>Adempimenti contabili, fiscali e di fatturazione</strong>{" "}
                    — base giuridica: obbligo legale (art. 6.1.c).
                  </li>
                  <li>
                    <strong>Comunicazioni di servizio</strong> relative a
                    iscrizioni, pagamenti e corsi — base giuridica: esecuzione del
                    contratto / legittimo interesse.
                  </li>
                  <li>
                    <strong>Sicurezza della piattaforma</strong> e prevenzione di
                    accessi non autorizzati e abusi — base giuridica: legittimo
                    interesse del titolare (art. 6.1.f).
                  </li>
                  <li>
                    Ove specificamente richiesto (registrazione, condizioni del
                    singolo corso), il trattamento si fonda sul{" "}
                    <strong>consenso</strong> dell&apos;interessato (art. 6.1.a),
                    revocabile in ogni momento.
                  </li>
                </ul>
              </Section>

              <Section id="destinatari" title="4. A chi comunichiamo i dati">
                <p>
                  I dati sono accessibili al personale autorizzato di Youvolution.
                  Per il funzionamento della piattaforma ci avvaliamo di fornitori
                  che agiscono come <strong>responsabili del trattamento</strong>:
                </p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    <strong>Supabase</strong> — database, servizio di
                    autenticazione e archiviazione dei file caricati (ricevute di
                    pagamento) [region UE, da confermare].
                  </li>
                  <li>
                    <strong>Vercel</strong> — hosting dell&apos;applicazione
                    [region, da confermare].
                  </li>
                  <li>
                    <strong>Resend</strong> — invio delle email transazionali e di
                    servizio (fornitore con sede negli Stati Uniti).
                  </li>
                </ul>
                <p>
                  I dati possono inoltre essere comunicati a consulenti (es.
                  studio commerciale) e alle autorità competenti, nei soli casi e
                  limiti previsti dalla legge. Gli istituti bancari indicati per il
                  bonifico ricevono i dati dell&apos;operazione disposta
                  dall&apos;utente. I dati <strong>non sono ceduti a terzi</strong>{" "}
                  per finalità commerciali.
                </p>
              </Section>

              <Section id="trasferimenti" title="5. Trasferimenti fuori dall'Unione Europea">
                <p>
                  L&apos;invio delle email tramite <strong>Resend</strong> comporta
                  un trasferimento di dati verso gli Stati Uniti. Tale
                  trasferimento è disciplinato dalle{" "}
                  <strong>Clausole Contrattuali Standard</strong> approvate dalla
                  Commissione Europea [e/o dall&apos;adesione del fornitore al Data
                  Privacy Framework], oltre a misure supplementari adeguate.
                </p>
                <p>
                  Per gli altri fornitori i dati sono conservati su infrastrutture
                  situate nell&apos;Unione Europea [da confermare in fase di
                  configurazione].
                </p>
              </Section>

              <Section id="conservazione" title="6. Per quanto tempo conserviamo i dati">
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    <strong>Dati dell&apos;account e anagrafici</strong>: per tutta
                    la durata del rapporto e per [periodo, es. 24 mesi] dalla sua
                    cessazione.
                  </li>
                  <li>
                    <strong>Iscrizioni, pagamenti, ricevute e documenti
                    contabili</strong>: 10 anni, come previsto dalla normativa
                    civilistica e fiscale.
                  </li>
                  <li>
                    <strong>Consensi prestati</strong>: per tutta la durata del
                    rapporto e per il periodo di prescrizione dei relativi diritti.
                  </li>
                  <li>
                    <strong>Note amministrative</strong>: per [periodo, es. 24
                    mesi] dalla conclusione del rapporto.
                  </li>
                  <li>
                    <strong>Log tecnici e di invio email</strong>: per [periodo,
                    es. 12 mesi].
                  </li>
                </ul>
                <p>
                  Al termine dei periodi indicati i dati sono cancellati o resi
                  anonimi in modo irreversibile.
                </p>
              </Section>

              <Section id="diritti" title="7. I tuoi diritti">
                <p>
                  In qualità di interessato puoi in ogni momento esercitare i
                  diritti previsti dagli articoli 15-22 del GDPR: accesso e copia
                  dei dati, rettifica, cancellazione (&laquo;diritto
                  all&apos;oblio&raquo;), limitazione, portabilità, opposizione al
                  trattamento fondato sul legittimo interesse, revoca del consenso.
                </p>
                <p>
                  Puoi aggiornare autonomamente i tuoi dati dalla pagina{" "}
                  <strong>&laquo;Il mio account&raquo;</strong>, dove è disponibile
                  anche una funzione per <strong>richiedere la cancellazione
                  dell&apos;account</strong>: il nostro team prende in carico la
                  richiesta e ti ricontatta per gestirla. Alcuni dati (in
                  particolare quelli contabili e fiscali) possono essere
                  conservati anche successivamente, per il tempo imposto dalla
                  legge.
                </p>
                <p>
                  Per ogni altra richiesta scrivi a{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="font-medium text-primary hover:underline underline-offset-4"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  : ti risponderemo entro un mese. Hai inoltre il diritto di
                  proporre reclamo al{" "}
                  <a
                    href="https://www.garanteprivacy.it"
                    className="text-primary hover:underline underline-offset-4"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Garante per la protezione dei dati personali
                  </a>
                  .
                </p>
              </Section>

              <Section id="sicurezza" title="8. Come proteggiamo i dati">
                <p>
                  Adottiamo misure tecniche e organizzative adeguate al rischio,
                  tra cui: accesso riservato e differenziato per ruolo applicato a
                  livello di database (Row Level Security), cifratura dei dati in
                  transito (TLS) e a riposo, gestione dell&apos;autenticazione
                  tramite fornitore specializzato, accesso ai file di pagamento
                  limitato al personale autorizzato e principio del privilegio
                  minimo.
                </p>
              </Section>

              <Section id="minori" title="9. Minori">
                <p>
                  La piattaforma è destinata a persone maggiorenni e non è rivolta
                  a minori di 18 anni. Non raccogliamo consapevolmente dati di
                  minori.
                </p>
              </Section>

              <Section id="modifiche" title="10. Modifiche a questa informativa">
                <p>
                  Questa informativa può essere aggiornata nel tempo. La versione
                  vigente è sempre quella pubblicata su questa pagina, con
                  indicazione della data di ultimo aggiornamento. In caso di
                  modifiche rilevanti gli utenti saranno informati tramite la
                  piattaforma e, se necessario, sarà richiesto un nuovo consenso.
                </p>
              </Section>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:text-primary hover:underline underline-offset-4">
              Torna alla piattaforma
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
