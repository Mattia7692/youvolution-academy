export function StatTile({
  label,
  value,
  evidenzia = false,
}: {
  label: string;
  value: string | number;
  evidenzia?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${evidenzia ? "text-emerald-600" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
