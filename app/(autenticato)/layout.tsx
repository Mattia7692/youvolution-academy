import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getProfiloUtente } from "@/lib/roles";
import { LogoutButton } from "@/components/logout-button";
import { RoleBadge } from "@/components/role-badge";
import { SidebarNav, type VoceNav } from "@/components/sidebar-nav";
import logo from "@/app/assets/youvolution-logo-white.webp";
import { SFONDO_SIDEBAR, COLORE_BRAND, TESTO_SIDEBAR, TESTO_SIDEBAR_MUTO } from "@/lib/tema";

const NAV_CORSISTA = [
  { href: "/catalogo", etichetta: "Catalogo" },
  { href: "/le-mie-iscrizioni", etichetta: "Le mie iscrizioni" },
  { href: "/account", etichetta: "Il mio account", separatore: true },
];

// Colori scritti come stile inline (non classi Tailwind custom): la sidebar
// scura vive sopra un tema di base chiaro, e alcune classi generate dalla
// palette custom (brand/sidebar-*) non venivano applicate in modo affidabile
// a runtime. Lo stile inline elimina quel problema alla radice.

export default async function AutenticatoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const profilo = await getProfiloUtente(supabase);

  if (!profilo) {
    redirect("/auth/login");
  }

  let nav: VoceNav[] = NAV_CORSISTA;

  if (profilo.ruolo === "admin" || profilo.ruolo === "owner") {
    // Contatori per avvisare l'admin appena un corsista completa il Passo 1
    // (prenotazione) o inserisce il CRO — notifica in-app, nessun invio email.
    const [{ data: inAttesaCandidate }, { count: coda }, { count: codaRate }] = await Promise.all([
      supabase.from("iscrizioni").select("id").eq("stato", "in_attesa_pagamento"),
      supabase
        .from("iscrizioni")
        .select("id", { count: "exact", head: true })
        .in("stato", ["cro_inserito", "cro_da_chiarire"]),
      supabase
        .from("iscrizioni_rate")
        .select("id", { count: "exact", head: true })
        .in("stato", ["cro_inserito", "cro_da_chiarire"]),
    ]);

    // Un'iscrizione con piano rate personalizzato resta 'in_attesa_pagamento'
    // per tutta la durata del piano: non conta come "prenotazione" in attesa
    // del primo bonifico (stesso motivo del filtro in admin/prenotazioni).
    const idsInAttesa = (inAttesaCandidate ?? []).map((i) => i.id);
    let idsConPianoRate = new Set<string>();
    if (idsInAttesa.length > 0) {
      const { data: rateEsistenti } = await supabase
        .from("iscrizioni_rate")
        .select("iscrizione_id")
        .in("iscrizione_id", idsInAttesa);
      idsConPianoRate = new Set((rateEsistenti ?? []).map((r) => r.iscrizione_id));
    }
    const prenotazioni = idsInAttesa.filter((id) => !idsConPianoRate.has(id)).length;

    nav = [
      { href: "/admin/corsi", etichetta: "Gestione corsi", gruppo: "CORSI" },
      { href: "/admin/codici-sconto", etichetta: "Codici sconto", gruppo: "CORSI" },
      {
        href: "/admin/iscrizione-personalizzata",
        etichetta: "Iscrizione su misura",
        gruppo: "CORSI",
      },
      {
        href: "/admin/prenotazioni",
        etichetta: "Prenotazioni",
        badge: prenotazioni,
        gruppo: "ISCRIZIONI",
      },
      {
        href: "/admin/coda-verifica",
        etichetta: "Coda di verifica",
        badge: (coda ?? 0) + (codaRate ?? 0),
        gruppo: "ISCRIZIONI",
      },
      { href: "/admin/iscritti", etichetta: "Iscritti", gruppo: "ISCRIZIONI" },
      { href: "/admin/utenti", etichetta: "Gestione utenti", gruppo: "SISTEMA" },
      { href: "/admin/informazioni", etichetta: "Informazioni", gruppo: "SISTEMA" },
    ];
  }

  const iniziali = `${profilo.nome[0] ?? ""}${profilo.cognome[0] ?? ""}`.toUpperCase();

  return (
    <div className="h-screen flex bg-background">
      <aside
        style={{ background: SFONDO_SIDEBAR }}
        className="w-[280px] shrink-0 flex flex-col min-h-0 p-5"
      >
        {/* Regione scrollabile: se le voci di nav sono troppe per l'altezza
            disponibile, scorrono qui dentro. min-h-0 e' necessario perche' un
            figlio flex di default non si restringe sotto il proprio
            contenuto (altrimenti "overflow-y-auto" non scatterebbe mai e
            trascinerebbe con se' tutta la sidebar). */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6">
          <Link href="/" className="block pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <Image
              src={logo}
              alt="Youvolution"
              width={240}
              height={46}
              style={{ width: "240px", height: "auto" }}
              priority
            />
          </Link>

          <div className="flex items-center gap-3">
            <div
              style={{ background: COLORE_BRAND }}
              className="size-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
            >
              {iniziali}
            </div>
            <div className="min-w-0">
              <p style={{ color: TESTO_SIDEBAR }} className="text-sm font-medium truncate">
                {profilo.nome} {profilo.cognome}
              </p>
              <p style={{ color: TESTO_SIDEBAR_MUTO }} className="text-xs truncate">
                {profilo.email}
              </p>
            </div>
          </div>

          <RoleBadge ruolo={profilo.ruolo} size="sm" />

          <SidebarNav voci={nav} />
        </div>

        {/* Fuori dalla regione scrollabile: resta sempre visibile in fondo,
            come una riga di intestazione fissa. */}
        <LogoutButton
          className="w-full shrink-0 mt-4 bg-transparent hover:bg-white/5"
          style={{ borderColor: "rgba(255,255,255,0.15)", color: TESTO_SIDEBAR }}
        />

        <Link
          href="/privacy"
          className="shrink-0 mt-2 text-center text-[11px] hover:underline"
          style={{ color: TESTO_SIDEBAR_MUTO }}
        >
          Informativa sulla privacy
        </Link>
      </aside>

      <main className="flex-1 min-h-0 overflow-y-auto px-8 py-10">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
