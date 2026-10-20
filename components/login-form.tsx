"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";
import { Nothing_You_Could_Do } from "next/font/google";
import { useRouter } from "next/navigation";
import { useState } from "react";
import logo from "@/app/assets/youvolution-logo-white.webp";

// «Academy» a mano sotto il logo, come nella sidebar (stesso font e azzurro)
const firma = Nothing_You_Could_Do({ weight: "400", subsets: ["latin"], display: "swap" });

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/");
      router.refresh();
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
      {/* Finestra con testata (logo + «Academy») come nel login della Training Room; il bagliore ambra dice dove si è */}
      <div
        className="overflow-hidden rounded-[14px] bg-card"
        style={{
          boxShadow:
            "0 0 0 1px rgba(130,215,250,0.38), 0 0 28px 2px rgba(76,195,245,0.36), 0 0 90px 10px rgba(40,160,220,0.26), 0 30px 70px rgba(0,0,0,0.45)",
        }}
      >
        <div
          className="px-7 pt-6 pb-5"
          style={{ background: "linear-gradient(180deg, #141c38 0%, #1a2348 55%, #3a1a22 100%)" }}
        >
          <Image src={logo} alt="Youvolution" className="w-[230px] max-w-full h-auto" priority />
          <span
            className={`${firma.className} block whitespace-nowrap select-none`}
            style={{ fontSize: "30px", lineHeight: 1, color: "#4cc3f5", margin: "2px 0 0 26%", transform: "rotate(-4deg)" }}
          >
            Academy
          </span>
        </div>
        <div className="p-7">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Accedi all&apos;Academy
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inserisci le tue credenziali per continuare
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Email
            </Label>
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
            <Label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full mt-1" disabled={isLoading}>
            {isLoading ? "Accesso in corso…" : "Accedi"}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm text-muted-foreground">
          Non hai un account?{" "}
          <Link
            href="/auth/registrazione"
            className="font-medium text-primary hover:underline underline-offset-4"
          >
            Registrati
          </Link>
        </div>
        </div>
      </div>

      <p className="text-center text-xs text-white/40">
        <Link href="/privacy" className="hover:text-white/70 transition-colors underline underline-offset-2">
          Informativa sulla privacy
        </Link>
      </p>
    </div>
  );
}
