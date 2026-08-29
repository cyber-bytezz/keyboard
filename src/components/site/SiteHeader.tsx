import { Button } from "@/components/ui/button";
import { useLiveViewers } from "@/lib/presence";

function LiveViewers() {
  const viewers = useLiveViewers();
  return (
    <span className="font-mono-ui hidden shrink-0 items-center gap-1.5 rounded-[3px] border border-border bg-surface px-2 py-1 text-[10px] text-muted-foreground sm:flex">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
      </span>
      {viewers} viewing
    </span>
  );
}

const LINKS = [
  { href: "#board", label: "live_board" },
  { href: "#how-it-works", label: "how_it_works" },
  { href: "#pricing", label: "pricing" },
  { href: "#faq", label: "faq" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3">
        <a href="#top" className="font-mono-ui flex min-w-0 items-center gap-2 text-sm font-bold">
          <span className="grid size-7 shrink-0 place-items-center rounded-[6px] border border-border bg-keycap text-[11px] text-clay">
            ⌘
          </span>
          <span className="truncate">Brand My Keyboard</span>
        </a>
        <div className="flex items-center gap-4">
          <LiveViewers />
          <nav className="font-mono-ui hidden items-center gap-6 text-xs text-muted-foreground md:flex">
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} className="transition-colors hover:text-primary">
                {link.label}
              </a>
            ))}
          </nav>
          <Button asChild size="sm" className="font-mono-ui shrink-0 text-xs">
            <a href="#board">claim a keycap</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
