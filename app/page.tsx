import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Nothing_You_Could_Do } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { getProfiloUtente } from "@/lib/roles";
import logo from "@/app/assets/youvolution-logo-white.webp";

// «Academy» a mano sotto il logo, come nella sidebar e nel login
const firma = Nothing_You_Could_Do({ weight: "400", subsets: ["latin"], display: "swap" });

const BG_STYLE = {
  background:
    "linear-gradient(180deg, #0f1a3d 0%, #1a2150 38%, #2b1b3d 70%, #3a1a22 100%)",
} as const;

export default async function HomePage() {
  const supabase = await createClient();
  const profilo = await getProfiloUtente(supabase);

  if (profilo) {
    const isAdminOrOwner = profilo.ruolo === "admin" || profilo.ruolo === "owner";
    redirect(isAdminOrOwner ? "/admin/corsi" : "/le-mie-iscrizioni");
  }

  return (
    <div className="min-h-screen flex flex-col" style={BG_STYLE}>
      <main className="flex-1 flex items-center justify-center px-6">
        <div
          className="max-w-sm w-full overflow-hidden rounded-[14px] bg-card"
          style={{
            boxShadow:
              "0 0 0 1px rgba(130,215,250,0.38), 0 0 28px 2px rgba(76,195,245,0.36), 0 0 90px 10px rgba(40,160,220,0.26), 0 30px 70px rgba(0,0,0,0.45)",
          }}
        >
          <div
            className="px-7 pt-6 pb-5"
            style={{ background: "linear-gradient(180deg, #141c38 0%, #1a2348 55%, #3a1a22 100%)" }}
          >
            <Image src={logo} alt="Youvolution" className="w-[230px] max-w-full h-auto" priority />
            <span
              className={`${firma.className} block whitespace-nowrap select-none`}
              style={{ fontSize: "30px", lineHeight: 1, color: "#4cc3f5", margin: "2px 0 0 26%", transform: "rotate(-4deg)" }}
            >
              Academy
            </span>
          </div>
          <div className="p-7 space-y-6">
            <p className="text-muted-foreground text-base leading-relaxed">
              La piattaforma per i corsisti Youvolution: scopri i corsi disponibili
              e gestisci la tua iscrizione in pochi passaggi.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center h-12 rounded-xl bg-primary text-primary-foreground px-8 text-base font-bold hover:bg-primary/90 transition"
              >
                Accedi
              </Link>
              <Link
                href="/auth/registrazione"
                className="block text-center rounded-xl border border-border text-muted-foreground px-4 py-3 text-sm font-medium hover:bg-muted transition"
              >
                Non hai ancora un account?{" "}
                <span className="font-semibold text-primary">Registrati</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-white/30 space-x-3">
        <span>© {new Date().getFullYear()} Youvolution Academy. Tutti i diritti riservati.</span>
        <Link href="/privacy" className="hover:text-white/60 transition-colors underline underline-offset-2">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
