"use client";

import { useState } from "react";
import type { VoceChangelog } from "@/lib/changelog";

const STILE_BOLLA_VERSIONE = {
  backgroundColor: "hsl(173 60% 35% / 0.15)",
  color: "hsl(173 60% 28%)",
};

export function ChangelogVoce({ voce, apertaInizialmente }: { voce: VoceChangelog; apertaInizialmente: boolean }) {
  const [aperta, setAperta] = useState(apertaInizialmente);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setAperta((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <span
          style={STILE_BOLLA_VERSIONE}
          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shrink-0"
        >
          {voce.versione}
        </span>
        <span className="text-sm font-medium text-foreground">{voce.titolo}</span>
        <span className={`text-muted-foreground transition-transform ${aperta ? "rotate-180" : ""}`}>
          ▾
        </span>
        <span className="text-xs text-muted-foreground">{voce.data}</span>
      </button>

      {aperta && (
        <ul className="mx-4 border-t border-border/60 px-5 pl-9 pt-4 pb-5 space-y-3 list-disc marker:text-muted-foreground/50">
          {voce.modifiche.map((modifica) => (
            <li key={modifica} className="text-sm text-muted-foreground leading-relaxed pl-1">
              {modifica}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
