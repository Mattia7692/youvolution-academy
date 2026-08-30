"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORE_BRAND } from "@/lib/tema";

export type IscrizioniAnno = { anno: string; corsisti: number };

function TooltipContenuto({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-xl px-3 py-2">
      <p className="text-sm font-semibold text-foreground">{payload[0].value} corsisti</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function IscrizioniAnnoChart({ dati }: { dati: IscrizioniAnno[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dati} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
        <XAxis
          dataKey="anno"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<TooltipContenuto />} />
        <Bar dataKey="corsisti" fill={COLORE_BRAND} radius={[4, 4, 0, 0]} barSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
