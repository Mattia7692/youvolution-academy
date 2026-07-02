import type { CSSProperties } from "react";
import type { Ruolo } from "@/lib/roles";

const ETICHETTE: Record<Ruolo, string> = {
  corsista: "Corsista",
  admin: "Admin",
};

const STILI_SM: Record<Ruolo, CSSProperties> = {
  corsista: { backgroundColor: "rgba(255,255,255,0.1)", color: "hsl(175 20% 88%)" },
  admin: { backgroundColor: "hsl(173 60% 35% / 0.25)", color: "hsl(173 70% 75%)" },
};

const STILI_MD: Record<Ruolo, CSSProperties> = {
  corsista: { backgroundColor: "hsl(30 10% 92%)", color: "hsl(20 8% 48%)" },
  admin: { backgroundColor: "hsl(173 60% 35% / 0.15)", color: "hsl(173 60% 28%)" },
};

export function RoleBadge({
  ruolo,
  size = "md",
}: {
  ruolo: Ruolo;
  size?: "sm" | "md";
}) {
  const stile = size === "sm" ? STILI_SM[ruolo] : STILI_MD[ruolo];
  return (
    <span
      style={stile}
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium w-fit"
    >
      {ETICHETTE[ruolo]}
    </span>
  );
}
