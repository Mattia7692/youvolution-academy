"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { richiediCancellazioneAccount } from "@/app/(autenticato)/account/actions";
import { Button } from "@/components/ui/button";

export function RichiediCancellazioneForm({ richiestaGiaInviata }: { richiestaGiaInviata: boolean }) {
  const [confermaVisibile, setConfermaVisibile] = useState(false);
  const [messaggio, setMessaggio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  if (richiestaGiaInviata) {
    return (
      <p className="text-sm text-muted-foreground">
        Hai già una richiesta di cancellazione in attesa di essere gestita dal nostro team.
      </p>
    );
  }

  const handleInvia = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await richiediCancellazioneAccount(messaggio);
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  if (!confermaVisibile) {
    return (
      <Button type="button" variant="destructive" onClick={() => setConfermaVisibile(true)}>
        Richiedi la cancellazione del mio account
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Il nostro team riceverà la richiesta e ti ricontatterà per gestirla. Puoi aggiungere una nota
        facoltativa.
      </p>
      <textarea
        value={messaggio}
        onChange={(e) => setMessaggio(e.target.value)}
        rows={2}
        placeholder="Motivo (facoltativo)"
        className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="destructive" disabled={isLoading} onClick={handleInvia}>
          {isLoading ? "Invio…" : "Conferma richiesta"}
        </Button>
        <Button type="button" variant="outline" disabled={isLoading} onClick={() => setConfermaVisibile(false)}>
          Annulla
        </Button>
      </div>
    </div>
  );
}
