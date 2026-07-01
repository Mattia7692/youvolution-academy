"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { CONSENSO_VERSIONE_CORRENTE } from "@/lib/consenso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegistrazioneForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [consensoAccettato, setConsensoAccettato] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegistrazione = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== repeatPassword) {
      setError("Le password non coincidono.");
      return;
    }

    if (!consensoAccettato) {
      setError("Devi accettare il trattamento dei dati per proseguire.");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/`,
          data: {
            nome,
            cognome,
            consenso_data: new Date().toISOString(),
            consenso_versione: CONSENSO_VERSIONE_CORRENTE,
          },
        },
      });
      if (error) throw error;
      router.push("/auth/registrazione-successo");
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Si è verificato un errore.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-xl bg-card border border-border shadow-xl p-7">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Crea il tuo account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registrati per iscriverti ai corsi Youvolution Academy
          </p>
        </div>

        <form onSubmit={handleRegistrazione} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cognome">Cognome</Label>
              <Input
                id="cognome"
                required
                value={cognome}
                onChange={(e) => setCognome(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nome@esempio.it"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="repeat-password">Ripeti password</Label>
            <Input
              id="repeat-password"
              type="password"
              required
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="consenso"
              checked={consensoAccettato}
              onCheckedChange={(checked) => setConsensoAccettato(checked === true)}
            />
            <Label htmlFor="consenso" className="text-sm font-normal leading-snug text-muted-foreground">
              Acconsento al trattamento dei miei dati personali per le finalità
              di registrazione e gestione del mio account, secondo l&apos;informativa privacy.
            </Label>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full mt-1" disabled={isLoading}>
            {isLoading ? "Creazione account…" : "Registrati"}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm text-muted-foreground">
          Hai già un account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline underline-offset-4"
          >
            Accedi
          </Link>
        </div>
      </div>
    </div>
  );
}
