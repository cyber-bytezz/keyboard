import { formatUsd, FUNDING_GOAL } from "@/lib/keyboard-layout";
import type { SponsorSpot } from "@/lib/auction";

export function FundingStats({ spots }: { spots: SponsorSpot[] }) {
  const taken = spots.filter((s) => s.status === "taken");
  const raised = taken.reduce((sum, s) => sum + s.current_price, 0);
  const pct = Math.min(100, (raised / FUNDING_GOAL) * 100);

  const items = [
    { label: "total_raised", value: formatUsd(raised) },
    { label: "funding_goal", value: formatUsd(FUNDING_GOAL) },
    { label: "spots_taken", value: `${taken.length} / ${spots.length}` },
  ];

  return (
    <div className="rounded-md border border-border bg-surface p-5">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="font-mono-ui text-[10px] uppercase tracking-wide text-muted-foreground">
              {item.label}
            </dt>
            <dd className="font-mono-ui mt-1 truncate text-lg font-bold text-foreground sm:text-xl">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 h-2 w-full overflow-hidden rounded-[2px] bg-keycap">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="font-mono-ui mt-2 text-[11px] text-muted-foreground">
        {pct.toFixed(1)}% funded — every dollar goes into the build: switches, caps, plate, films,
        lube, and the printing rig.
      </p>
    </div>
  );
}
