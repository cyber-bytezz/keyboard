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
    <div className="card-surface h-full rounded-2xl border border-border bg-surface p-6">
      <dl className="grid grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="font-mono-ui truncate text-[10px] uppercase tracking-wide text-muted-foreground">
              {item.label}
            </dt>
            <dd className="font-mono-ui mt-1.5 truncate text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-2.5 w-full min-w-0 overflow-hidden rounded-full bg-keycap">
          <div
            className="h-full rounded-full bg-gradient-to-r from-clay to-clay/70 transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono-ui shrink-0 text-xs font-bold tabular-nums text-clay">
          {pct.toFixed(1)}%
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        funded — every dollar goes into the build: switches, caps, plate, films, lube, and the
        printing rig.
      </p>
    </div>
  );
}
