"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SidebarNav({
  voci,
}: {
  voci: { href: string; etichetta: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 flex-1">
      {voci.map((voce) => {
        const attivo = pathname === voce.href || pathname?.startsWith(`${voce.href}/`);
        return (
          <Link
            key={voce.href}
            href={voce.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
              attivo
                ? "bg-brand/15 text-sidebar-fg font-medium border border-brand/30"
                : "text-sidebar-fg/70 hover:bg-white/5 hover:text-sidebar-fg",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full shrink-0",
                attivo ? "bg-brand" : "bg-sidebar-muted",
              )}
            />
            {voce.etichetta}
          </Link>
        );
      })}
    </nav>
  );
}
