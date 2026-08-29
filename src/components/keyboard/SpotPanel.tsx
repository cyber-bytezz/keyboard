import type { SponsorSpot } from "@/lib/auction";
import { useSponsorLogos, useSpotBids } from "@/lib/auction";
import { formatUsd, MAX_BID, MIN_INCREMENT } from "@/lib/keyboard-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SpotPanel({
  spot,
  onBid,
}: {
  spot: SponsorSpot | null;
  onBid: (spot: SponsorSpot) => void;
}) {
  const { data: bids } = useSpotBids(spot?.id ?? null);
  const { data: logos } = useSponsorLogos(spot ? [spot] : []);
  const logoUrl = spot?.sponsor_logo_url ? logos?.[spot.sponsor_logo_url] : undefined;

  if (!spot) {
    return (
      <div className="font-mono-ui flex h-full min-h-[280px] flex-col justify-center rounded-md border border-dashed border-border bg-surface/50 p-6 text-xs text-muted-foreground">
        <p className="text-clay">{"// select a keycap"}</p>
        <p className="mt-2 leading-relaxed">
          Pale caps are open for bidding. Red caps already belong to a sponsor. Click any cap to
          inspect its price and bid history.
        </p>
      </div>
    );
  }

  const isOpen = spot.status === "open";

  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-surface p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="font-mono-ui text-xs text-muted-foreground">spot/{spot.key_code}</p>
          <h3 className="font-mono-ui truncate text-xl font-bold text-foreground">{spot.label}</h3>
        </div>
        <span
          className={cn(
            "font-mono-ui shrink-0 rounded-[3px] px-2 py-1 text-[10px] uppercase",
            isOpen ? "bg-primary/15 text-primary" : "bg-clay/20 text-clay-foreground",
          )}
        >
          {spot.status}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <dt className="font-mono-ui text-[10px] uppercase text-muted-foreground">current price</dt>
          <dd className="font-mono-ui mt-1 text-lg font-bold text-foreground">
            {formatUsd(spot.current_price)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="font-mono-ui text-[10px] uppercase text-muted-foreground">sponsor</dt>
          <dd className="mt-1 flex items-center gap-2 text-sm text-foreground">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${spot.sponsor_name ?? "Sponsor"} logo`}
                className="size-6 shrink-0 rounded-[3px] bg-white/90 object-contain p-0.5"
                loading="lazy"
              />
            ) : null}
            <span className="truncate">{spot.sponsor_name ?? "—"}</span>
          </dd>
        </div>
      </dl>

      <div className="mt-5 min-h-0 flex-1">
        <p className="font-mono-ui text-[10px] uppercase text-muted-foreground">bid_history</p>
        <ul className="font-mono-ui mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
          {(bids ?? []).length === 0 ? (
            <li className="text-muted-foreground">no bids yet — opening price stands</li>
          ) : (
            (bids ?? []).map((bid) => (
              <li
                key={bid.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-border/60 py-1.5"
              >
                <span className="truncate text-muted-foreground">
                  {bid.company}
                  <span
                    className={cn(
                      "ml-2",
                      bid.status === "active" ? "text-primary" : "text-muted-foreground/60",
                    )}
                  >
                    [{bid.status}]
                  </span>
                </span>
                <span className="shrink-0 text-foreground">{formatUsd(bid.amount)}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="mt-5">
        <Button
          className="font-mono-ui w-full text-xs"
          disabled={!isOpen || spot.current_price >= MAX_BID}
          onClick={() => onBid(spot)}
        >
          {!isOpen
            ? "taken"
            : spot.current_price >= MAX_BID
              ? `at cap — ${formatUsd(MAX_BID)} reached`
              : `place a bid — min ${formatUsd(Math.min(Math.max(spot.current_price + MIN_INCREMENT, 2), MAX_BID))}`}
        </Button>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Bids run $2–$6, paid up front. Outbid later? Your money comes straight back.
        </p>
      </div>
    </div>
  );
}
