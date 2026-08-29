import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/sections/SiteFooter";
import { KeyboardBoard } from "@/components/keyboard/KeyboardBoard";
import { SpotPanel } from "@/components/keyboard/SpotPanel";
import { BidModal } from "@/components/keyboard/BidModal";
import { FundingStats } from "@/components/sections/FundingStats";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { PricingTiers } from "@/components/sections/PricingTiers";
import { Faq } from "@/components/sections/Faq";
import { useSponsorSpots, type SponsorSpot } from "@/lib/auction";

const TITLE = "Brand My Keyboard — sponsor a keycap, live auction";
const DESCRIPTION =
  "Bid on individual keycaps of a custom mechanical keyboard. Winning sponsors get their logo printed on a real cap that appears in every build-in-public photo and video.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: spots, isLoading } = useSponsorSpots();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bidSpot, setBidSpot] = useState<SponsorSpot | null>(null);

  const list = useMemo(() => spots ?? [], [spots]);
  const byCode = useMemo(() => new Map(list.map((s) => [s.key_code, s])), [list]);
  const selected = list.find((s) => s.id === selectedId) ?? null;

  return (
    <div id="top" className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative mx-auto w-full max-w-6xl px-5 pb-10 pt-16 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[420px] w-[820px] max-w-[95vw] -translate-x-1/2 rounded-full bg-clay/10 blur-[130px]"
          />
          <p className="font-mono-ui inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-clay">
            <span className="text-muted-foreground">$</span>./brand-my-keyboard --live
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-6xl">
            Put your logo on a keycap I actually type on.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            I'm building a custom mechanical keyboard in public. Every sponsor keycap gets your logo
            UV-printed on a real cap — then it shows up in the build logs, macro shots and dev videos
            that follow. Spin the board, pick a cap, place your bid.
          </p>

          <div id="board" className="mt-12 space-y-6 text-left">
            {isLoading ? (
              <div className="font-mono-ui h-[320px] animate-pulse rounded-md border border-border bg-surface p-6 text-xs text-muted-foreground">
                loading board…
              </div>
            ) : (
              <KeyboardBoard
                spots={byCode}
                selectedCode={selected?.key_code ?? null}
                onSelect={(spot) => setSelectedId(spot.id)}
              />
            )}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                <FundingStats spots={list} />
              </div>
              <div className="min-w-0">
                <SpotPanel spot={selected} onBid={(spot) => setBidSpot(spot)} />
              </div>
            </div>
          </div>
        </section>


        <HowItWorks />
        <PricingTiers spots={list} />
        <Faq />
      </main>

      <SiteFooter />

      <BidModal
        spot={bidSpot}
        open={Boolean(bidSpot)}
        onOpenChange={(open) => !open && setBidSpot(null)}
      />
    </div>
  );
}
