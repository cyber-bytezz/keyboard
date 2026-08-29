export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-10 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <p className="font-mono-ui text-sm font-bold text-foreground">Brand My Keyboard</p>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
            A build-in-public experiment: one custom mechanical keyboard, funded one keycap at a
            time by the tools its owner actually uses.
          </p>
        </div>
        <div className="font-mono-ui flex flex-wrap gap-5 text-xs text-muted-foreground">
          <a href="mailto:hello@brandmykeyboard.dev" className="hover:text-primary">
            hello@brandmykeyboard.dev
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-primary"
          >
            /x
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-primary"
          >
            /github
          </a>
        </div>
      </div>
    </footer>
  );
}
