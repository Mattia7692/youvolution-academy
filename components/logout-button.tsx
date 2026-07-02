"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={logout}
      className={cn("text-base", className)}
      style={style}
    >
      Logout
    </Button>
  );
}
