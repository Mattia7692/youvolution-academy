import { COLORE_BRAND } from "@/lib/tema";

export function AvatarIniziali({ nome, cognome, size = 40 }: { nome: string; cognome: string; size?: number }) {
  const iniziali = `${nome[0] ?? ""}${cognome[0] ?? ""}`.toUpperCase();
  return (
    <div
      style={{ background: COLORE_BRAND, width: size, height: size, fontSize: size * 0.375 }}
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
    >
      {iniziali}
    </div>
  );
}
