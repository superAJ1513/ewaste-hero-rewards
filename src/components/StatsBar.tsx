const stats = [
  { label: "Total E-Waste Collected", value: "2,847", unit: "items" },
  { label: "Active Users", value: "1,442", unit: "players" },
  { label: "Prizes Awarded", value: "38", unit: "rewards" },
];

export function StatsBar() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="border border-border bg-surface p-4 text-center">
          <div className="font-display text-2xl italic tabular-nums text-neon-acid">{stat.value}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
