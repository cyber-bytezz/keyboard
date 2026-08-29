import { SectionHeading } from "@/components/site/SectionHeading";

const STEPS = [
  {
    n: "01",
    title: "Pick a keycap",
    body: "Scan the board, find a cap that fits your brand's energy. Esc for the chaotic ones, Enter for the ones who ship, spacebar if you want the whole frame.",
  },
  {
    n: "02",
    title: "Place a bid",
    body: "Beat the current price by at least $1 — bids run $2 to $6, never more. Top bid holds the cap. Get outbid and you owe nothing — I only invoice winners once the board closes.",
  },
  {
    n: "03",
    title: "Ride along",
    body: "I print your logo on a real keycap, mount it, and the board shows up in build logs, macro shots, typing tests and every dev video I make after.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl px-5 py-20">
      <SectionHeading file="how_it_works.sh" title="Three steps, no account needed">
        The auction runs until the board is full or the goal is hit — whichever comes first.
      </SectionHeading>
      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="rounded-md border border-border bg-surface p-6">
            <p className="font-mono-ui text-xs font-bold text-clay">{step.n}</p>
            <h3 className="mt-3 text-lg font-bold text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
