"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvaRataCro } from "@/app/(autenticato)/iscrizione/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RataForm({
  rataId,
  importoSuggerito,
}: {
  rataId: string;
  importoSuggerito: number;
}) {
  const [cro, setCro] = useState("");
  const [data, setData] = useState("");
  const [bancaOrdinante, setBancaOrdinante] = useState("");
  const [ammontare, setAmmontare] = useState(String(importoSuggerito));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const risultato = await salvaRataCro(rataId, { cro, data, bancaOrdinante, ammontare });
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
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rata-data">Data bonifico</Label>
          <Input id="rata-data" type="date" required value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rata-ammontare">Ammontare (€)</Label>
          <Input
            id="rata-ammontare"
            type="number"
            min="0"
            step="0.01"
            required
            value={ammontare}
            onChange={(e) => setAmmontare(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rata-banca-ordinante">Banca ordinante</Label>
        <Input
          id="rata-banca-ordinante"
          required
          value={bancaOrdinante}
          onChange={(e) => setBancaOrdinante(e.target.value)}
          placeholder="Es. Intesa Sanpaolo"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rata-cro">CRO del bonifico</Label>
        <Input
          id="rata-cro"
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
        {isLoading ? "Invio in corso…" : "Conferma rata"}
      </Button>
    </form>
  );
}
