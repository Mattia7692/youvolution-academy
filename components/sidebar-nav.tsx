"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TESTO_SIDEBAR = "hsl(175 20% 88%)";
const TESTO_SIDEBAR_ATTENUATO = "rgba(255,255,255,0.65)";
const PUNTO_MUTO = "hsl(190 12% 55%)";
const ETICHETTA_GRUPPO = "hsl(190 12% 55%)";
// Accento arancione riservato alla voce attiva, per contrasto rispetto al
// blu/teal usato come colore brand generale (stesso schema dell'enterprise,
// dove il brand arancione ha un accento contrastante sulla voce selezionata).
const ACCENTO_ATTIVO = "hsl(28 90% 55%)";

export type VoceNav = { href: string; etichetta: string; badge?: number; gruppo?: string };

export function SidebarNav({ voci }: { voci: VoceNav[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 flex-1">
      {voci.map((voce, indice) => {
        const attivo = pathname === voce.href || pathname?.startsWith(`${voce.href}/`);
        const nuovoGruppo = voce.gruppo && voce.gruppo !== voci[indice - 1]?.gruppo;
        return (
          <div key={voce.href} className="flex flex-col gap-1">
            {nuovoGruppo && (
              <p
                className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wider uppercase"
                style={{ color: ETICHETTA_GRUPPO }}
              >
                {voce.gruppo}
              </p>
            )}
            <Link
              href={voce.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/5"
              style={{
                backgroundColor: attivo ? "hsl(28 90% 55% / 0.15)" : "transparent",
                border: attivo ? "1px solid hsl(28 90% 55% / 0.35)" : "1px solid transparent",
                color: attivo ? TESTO_SIDEBAR : TESTO_SIDEBAR_ATTENUATO,
                fontWeight: attivo ? 500 : 400,
              }}
            >
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: attivo ? ACCENTO_ATTIVO : PUNTO_MUTO }}
              />
              <span className="flex-1">{voce.etichetta}</span>
              {!!voce.badge && (
                <span
                  className="text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-5 text-center"
                  style={{ backgroundColor: "hsl(28 90% 55%)", color: "white" }}
                >
                  {voce.badge}
                </span>
              )}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
