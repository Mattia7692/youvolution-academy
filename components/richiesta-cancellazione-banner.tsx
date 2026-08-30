"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { gestisciRichiestaCancellazione } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";

function formattaData(data: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(data),
  );
}

export function RichiestaCancellazioneBanner({
  richiestaId,
  messaggio,
  createdAt,
}: {
  richiestaId: string;
  messaggio: string | null;
  createdAt: string;
}) {
  const [notaGestione, setNotaGestione] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGestisci = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await gestisciRichiestaCancellazione(richiestaId, notaGestione);
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
      <div>
        <h2 className="font-medium text-foreground">Richiesta di cancellazione dati (GDPR)</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Richiesta inviata il {formattaData(createdAt)}. La cancellazione/anonimizzazione effettiva è un
          processo manuale: valutala e poi segnala qui come gestita.
        </p>
        {messaggio && <p className="text-sm text-foreground mt-2 italic">“{messaggio}”</p>}
      </div>
      <textarea
        value={notaGestione}
        onChange={(e) => setNotaGestione(e.target.value)}
        rows={2}
        placeholder="Nota su come è stata gestita (facoltativa)"
        className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <Button size="sm" variant="outline" disabled={isLoading} onClick={handleGestisci}>
        {isLoading ? "Salvataggio…" : "Segna come gestita"}
      </Button>
    </div>
  );
}
