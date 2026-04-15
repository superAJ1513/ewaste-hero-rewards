const RULES = [
  {
    icon: "🔍",
    title: "Weekly Verification",
    text: "All uploaded photos are verified at the end of each week. Rewards are only given if the item was actually deposited in the collection box.",
  },
  {
    icon: "🏆",
    title: "Next In Line",
    text: "If a top ranker's submissions fail verification, the prize passes to the next eligible ranker on the leaderboard.",
  },
  {
    icon: "🚫",
    title: "Zero Tolerance",
    text: "Submitting fake or unverified photos repeatedly will result in a permanent ban from the platform.",
  },
  {
    icon: "✏️",
    title: "Mark Your Items",
    text: "For products with similar looks (e.g. AA batteries), please mark your e-waste with the marker tied to the collection box so we can identify your submission.",
  },
];

export function RulesSection() {
  return (
    <div className="border border-border bg-surface p-5 sm:p-6">
      <h3 className="font-display text-xl italic uppercase tracking-tighter mb-4 sm:text-2xl">
        Arena <span className="text-neon-cyan">Rules</span>
      </h3>
      <div className="space-y-3">
        {RULES.map((rule) => (
          <div key={rule.title} className="flex gap-3 items-start">
            <span className="mt-0.5 text-lg shrink-0">{rule.icon}</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-foreground">
                {rule.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {rule.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
