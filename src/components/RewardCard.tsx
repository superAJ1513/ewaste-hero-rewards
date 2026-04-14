export function RewardCard() {
  return (
    <div className="bg-neon-acid/10 border-2 border-neon-acid/30 p-5 sm:p-6">
      <h4 className="font-display italic uppercase mb-2">Weekly Jackpot</h4>
      <div className="text-2xl font-display text-neon-acid italic tracking-widest mb-3 sm:text-3xl">
        MYSTERY PRIZE
      </div>
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <span>Ends in: 02D 14H 45M</span>
        <span>Entries: 1,442</span>
      </div>
      <div className="mt-4 h-1.5 bg-secondary w-full">
        <div className="h-full bg-neon-acid w-[65%] neon-glow-acid" />
      </div>
    </div>
  );
}
