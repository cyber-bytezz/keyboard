import { SectionHeading } from "@/components/site/SectionHeading";
import { formatUsd, TIERS } from "@/lib/keyboard-layout";
import type { SponsorSpot } from "@/lib/auction";

export function PricingTiers({ spots }: { spots: SponsorSpot[] }) {
  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-5 py-20">
      <SectionHeading file="pricing_tiers.json" title="Four tiers of keycap real estate">
        Prices below are opening bids. The board decides the rest.
      </SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier) => {
          const tierSpots = spots.filter((s) => s.tier === tier.id);
          const open = tierSpots.filter((s) => s.status === "open").length;
          return (
            <div
              key={tier.id}
              className="flex flex-col rounded-md border border-border bg-surface p-6"
            >
              <p className="font-mono-ui text-xs text-muted-foreground">"{tier.file}": {"{"}</p>
              <h3 className="font-mono-ui mt-3 text-lg font-bold text-foreground">{tier.name}</h3>
              <p className="font-mono-ui mt-1 text-2xl font-bold text-primary">
                {formatUsd(tier.from)}
                <span className="text-xs font-normal text-muted-foreground"> / opening</span>
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                {tier.description}
              </p>
              <p className="font-mono-ui mt-4 text-[11px] text-muted-foreground">
                {open} of {tierSpots.length} still open
              </p>
              <p className="font-mono-ui mt-3 text-xs text-muted-foreground">{"}"}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
