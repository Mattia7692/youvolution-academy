import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getProfiloUtente } from "@/lib/roles";
import { LogoutButton } from "@/components/logout-button";
import { RoleBadge } from "@/components/role-badge";
import { SidebarNav, type VoceNav } from "@/components/sidebar-nav";
import logo from "@/app/assets/youvolution-logo-white.webp";

const NAV_CORSISTA = [
  { href: "/catalogo", etichetta: "Catalogo" },
  { href: "/le-mie-iscrizioni", etichetta: "Le mie iscrizioni" },
];

// Colori scritti come stile inline (non classi Tailwind custom): la sidebar
// scura vive sopra un tema di base chiaro, e alcune classi generate dalla
// palette custom (brand/sidebar-*) non venivano applicate in modo affidabile
// a runtime. Lo stile inline elimina quel problema alla radice.
const SFONDO_SIDEBAR = "linear-gradient(170deg, hsl(222 45% 10%) 0%, hsl(208 55% 45%) 100%)";
const COLORE_BRAND = "hsl(173 60% 35%)";
const TESTO_SIDEBAR = "hsl(175 20% 88%)";
const TESTO_SIDEBAR_MUTO = "hsl(190 12% 62%)";

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

  if (profilo.ruolo === "admin") {
    // Contatori per avvisare l'admin appena un corsista completa il Passo 1
    // (prenotazione) o inserisce il CRO — notifica in-app, nessun invio email.
    const [{ count: prenotazioni }, { count: coda }] = await Promise.all([
      supabase
        .from("iscrizioni")
        .select("id", { count: "exact", head: true })
        .eq("stato", "in_attesa_pagamento"),
      supabase
        .from("iscrizioni")
        .select("id", { count: "exact", head: true })
        .in("stato", ["cro_inserito", "cro_da_chiarire"]),
    ]);

    nav = [
      { href: "/admin/corsi", etichetta: "Gestione corsi", gruppo: "CORSI" },
      { href: "/admin/codici-sconto", etichetta: "Codici sconto", gruppo: "CORSI" },
      {
        href: "/admin/prenotazioni",
        etichetta: "Prenotazioni",
        badge: prenotazioni ?? 0,
        gruppo: "ISCRIZIONI",
      },
      {
        href: "/admin/coda-verifica",
        etichetta: "Coda di verifica",
        badge: coda ?? 0,
        gruppo: "ISCRIZIONI",
      },
      { href: "/admin/informazioni", etichetta: "Informazioni", gruppo: "SISTEMA" },
    ];
  }

  const iniziali = `${profilo.nome[0] ?? ""}${profilo.cognome[0] ?? ""}`.toUpperCase();

  return (
    <div className="h-screen flex bg-background">
      <aside
        style={{ background: SFONDO_SIDEBAR }}
        className="w-[280px] shrink-0 flex flex-col p-5 gap-6 overflow-y-auto"
      >
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

        <LogoutButton
          className="w-full bg-transparent hover:bg-white/5"
          style={{ borderColor: "rgba(255,255,255,0.15)", color: TESTO_SIDEBAR }}
        />
      </aside>

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
