import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getProfiloUtente } from "@/lib/roles";
import { LogoutButton } from "@/components/logout-button";
import { RoleBadge } from "@/components/role-badge";
import { SidebarNav } from "@/components/sidebar-nav";
import logo from "@/app/assets/youvolution-logo-white.webp";

const NAV_CORSISTA = [
  { href: "/catalogo", etichetta: "Catalogo" },
  { href: "/le-mie-iscrizioni", etichetta: "Le mie iscrizioni" },
];

const NAV_ADMIN = [
  { href: "/admin/coda-verifica", etichetta: "Coda di verifica" },
  { href: "/admin/corsi", etichetta: "Gestione corsi" },
];

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

  const nav = profilo.ruolo === "admin" ? NAV_ADMIN : NAV_CORSISTA;
  const iniziali = `${profilo.nome[0] ?? ""}${profilo.cognome[0] ?? ""}`.toUpperCase();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="sidebar-gradient w-64 shrink-0 flex flex-col p-5 gap-6">
        <Link href="/">
          <Image src={logo} alt="Youvolution" className="w-full h-auto" priority />
        </Link>

        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-brand flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {iniziali}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-sidebar-fg truncate">
              {profilo.nome} {profilo.cognome}
            </p>
            <p className="text-xs text-sidebar-muted truncate">{profilo.email}</p>
          </div>
        </div>

        <RoleBadge ruolo={profilo.ruolo} size="sm" />

        <SidebarNav voci={nav} />

        <LogoutButton className="w-full bg-transparent border-white/15 text-sidebar-fg hover:bg-white/5 hover:text-sidebar-fg" />
      </aside>

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
