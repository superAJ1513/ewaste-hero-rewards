const MOCK_LEADERS = [
  { rank: 1, name: "KRYPTO_KING", items: 124, score: 24840, tier: "LEGENDARY" },
  { rank: 2, name: "VOID_RUNNER", items: 98, score: 19205, tier: "MASTER" },
  { rank: 3, name: "SILICON_WITCH", items: 82, score: 15440, tier: "ELITE" },
  { rank: 4, name: "CYBER_PUNK", items: 67, score: 12890, tier: "PRO" },
  { rank: 5, name: "NEON_GHOST", items: 54, score: 10200, tier: "PRO" },
];

function getRankColor(rank: number) {
  if (rank === 1) return "text-neon-acid border-neon-acid";
  if (rank === 2) return "text-neon-cyan border-neon-cyan";
  return "text-muted-foreground border-border";
}

function getTierColor(tier: string) {
  if (tier === "LEGENDARY") return "bg-neon-acid/10 text-neon-acid";
  if (tier === "MASTER") return "bg-neon-cyan/10 text-neon-cyan";
  return "bg-secondary text-muted-foreground";
}

export function LeaderboardTable({ compact = false }: { compact?: boolean }) {
  const leaders = compact ? MOCK_LEADERS.slice(0, 3) : MOCK_LEADERS;

  return (
    <div className="space-y-2">
      {leaders.map((leader) => (
        <div
          key={leader.rank}
          className="flex items-center gap-3 border border-border bg-secondary/50 p-3 transition-colors hover:border-neon-acid/40 sm:gap-4 sm:p-4"
        >
          <span className={`font-display text-2xl italic ${getRankColor(leader.rank).split(" ")[0]} w-8`}>
            {String(leader.rank).padStart(2, "0")}
          </span>
          <div className={`hidden size-10 shrink-0 border-2 bg-muted sm:block ${getRankColor(leader.rank).split(" ")[1]}`} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold uppercase tracking-tight">{leader.name}</div>
            <div className="flex gap-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 ${getTierColor(leader.tier)}`}>
                {leader.tier}
              </span>
              <span className="bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                {leader.items} Items
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-display text-lg italic tabular-nums ${leader.rank === 1 ? "text-neon-acid" : ""}`}>
              {leader.score.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground">XP</div>
          </div>
        </div>
      ))}
    </div>
  );
}
