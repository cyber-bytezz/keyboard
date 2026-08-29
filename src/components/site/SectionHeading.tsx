import type { ReactNode } from "react";

export function SectionHeading({
  file,
  title,
  children,
}: {
  file: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-10">
      <p className="font-mono-ui text-xs tracking-tight text-clay">
        <span className="text-muted-foreground">~/brand-my-keyboard $ </span>
        cat {file}
      </p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {children ? (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{children}</p>
      ) : null}
    </div>
  );
}
