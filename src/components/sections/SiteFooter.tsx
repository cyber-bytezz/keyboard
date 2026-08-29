export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/60">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-12 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <span className="font-mono-ui inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-clay" />
            built in public
          </span>
          <p className="mt-3 text-sm font-bold text-foreground">Brand My Keyboard</p>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
            A build-in-public experiment: one custom mechanical keyboard, funded one keycap at a
            time by the tools its owner actually uses.
          </p>
        </div>
        <div className="font-mono-ui flex flex-wrap gap-5 text-xs text-muted-foreground">
          <a
            href="mailto:hello@brandmykeyboard.dev"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            hello@brandmykeyboard.dev
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer noopener"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            /x
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer noopener"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            /github
          </a>
        </div>
      </div>
    </footer>
  );
}
