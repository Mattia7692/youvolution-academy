import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfiloUtente } from "@/lib/roles";

const BG_STYLE = {
  background:
    "linear-gradient(160deg, hsl(190 30% 10%) 0%, hsl(190 28% 14%) 45%, hsl(173 35% 16%) 100%)",
} as const;

export default async function HomePage() {
  const supabase = await createClient();
  const profilo = await getProfiloUtente(supabase);

  if (profilo) {
    redirect(profilo.ruolo === "admin" ? "/admin/corsi" : "/le-mie-iscrizioni");
  }

  return (
    <div className="min-h-screen flex flex-col" style={BG_STYLE}>
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-8">
          <h1 className="text-3xl font-bold text-white">Youvolution Academy</h1>
          <p className="text-white/70 text-base leading-relaxed">
            La piattaforma per i corsisti Youvolution: scopri i corsi disponibili
            e gestisci la tua iscrizione in pochi passaggi.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center h-12 rounded-xl bg-white text-neutral-900 px-8 text-base font-bold hover:bg-white/90 transition"
            >
              Accedi
            </Link>
            <Link
              href="/auth/registrazione"
              className="inline-flex items-center justify-center h-12 rounded-xl border border-white/20 text-white/80 px-8 text-base font-medium hover:bg-white/[0.06] hover:text-white transition"
            >
              Non hai ancora un account?{" "}
              <span className="ml-1 font-semibold text-white">Registrati</span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-white/30">
        © {new Date().getFullYear()} Youvolution Academy. Tutti i diritti riservati.
      </footer>
    </div>
  );
}
