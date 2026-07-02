"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvaPasso2 } from "@/app/(autenticato)/iscrizione/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Passo2Form({ iscrizioneId }: { iscrizioneId: string }) {
  const [cro, setCro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const risultato = await salvaPasso2(iscrizioneId, cro);
    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }

    router.push("/le-mie-iscrizioni");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-card border border-border shadow-xl p-7 flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cro">CRO del bonifico</Label>
        <Input
          id="cro"
          required
          value={cro}
          onChange={(e) => setCro(e.target.value)}
          placeholder="Es. 12345678901"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full mt-1" disabled={isLoading}>
        {isLoading ? "Invio in corso…" : "Invia per la verifica"}
      </Button>
    </form>
  );
}
