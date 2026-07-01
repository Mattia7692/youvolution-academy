import { cn } from "@/lib/utils";
import type { Ruolo } from "@/lib/roles";

const ETICHETTE: Record<Ruolo, string> = {
  corsista: "Corsista",
  admin: "Admin",
};

const COLORI_SM: Record<Ruolo, string> = {
  corsista: "bg-white/10 text-sidebar-fg",
  admin: "bg-brand/25 text-brand",
};

const COLORI_MD: Record<Ruolo, string> = {
  corsista: "bg-muted text-muted-foreground",
  admin: "bg-brand/15 text-brand",
};

export function RoleBadge({
  ruolo,
  size = "md",
}: {
  ruolo: Ruolo;
  size?: "sm" | "md";
}) {
  const colori = size === "sm" ? COLORI_SM : COLORI_MD;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colori[ruolo],
      )}
    >
      {ETICHETTE[ruolo]}
    </span>
  );
}
