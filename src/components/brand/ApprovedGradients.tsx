import * as React from "react";
import type { ApprovedGradient } from "@/lib/approved-gradients";
import { cn } from "@/design-system/element/lib/utils";

export interface ApprovedGradientsProps extends React.HTMLAttributes<HTMLDivElement> {
  gradients: ApprovedGradient[];
}

/** Visual reference for approved gradients: swatch, stops, and the gradient in use. */
export const ApprovedGradients = React.forwardRef<HTMLDivElement, ApprovedGradientsProps>(
  ({ gradients, className, ...props }, ref) => {
    if (!gradients.length) return null;
    return (
      <div ref={ref} className={cn("grid gap-6 md:grid-cols-2", className)} {...props}>
        {gradients.map((g) => (
          <figure key={g.id} className="overflow-hidden rounded-md border border-border bg-card">
            <div className="grid grid-cols-[1fr_1fr]">
              <div className="h-40" style={{ background: g.css }} role="img" aria-label={`${g.name} swatch`} />
              <GradientInUse g={g} />
            </div>
            <figcaption className="space-y-2 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="font-semibold text-foreground">{g.name}</h4>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{g.angle}</span>
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {g.stops.map((s) => (
                  <li key={s.label + s.hex} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-3 w-3 rounded-sm border border-border" style={{ background: s.hex }} aria-hidden />
                    <span className="font-mono">{s.hex.toUpperCase()}</span> {s.label}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-foreground/80">{g.use}</p>
              {g.dont && <p className="text-xs text-muted-foreground">Don’t: {g.dont}</p>}
            </figcaption>
          </figure>
        ))}
      </div>
    );
  },
);
ApprovedGradients.displayName = "ApprovedGradients";

function GradientInUse({ g }: { g: ApprovedGradient }) {
  const label = <span className="absolute left-3 top-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">In use</span>;
  const wrap = "relative flex h-40 items-center justify-center bg-background p-4";
  switch (g.example) {
    case "numeral":
      return (
        <div className={wrap}>{label}
          <div className="text-center">
            <div className="bg-clip-text text-5xl font-semibold leading-none text-transparent" style={{ backgroundImage: g.css }}>98%</div>
            <div className="mt-2 text-xs text-muted-foreground">Client retention</div>
          </div>
        </div>
      );
    case "rule":
      return (
        <div className={cn(wrap, "flex-col items-stretch gap-3")}>{label}
          <div className="text-sm font-semibold text-foreground">Step 2 of 3</div>
          <div className="h-1.5 rounded-full" style={{ background: g.css }} />
          <div className="h-px w-2/3" style={{ background: g.css }} />
        </div>
      );
    case "card":
      return (
        <div className={cn(wrap, "bg-muted/40")}>{label}
          <div className="w-full rounded-lg border p-3 shadow-sm" style={{ background: g.css }}>
            <div className="text-xs text-muted-foreground">Frost card</div>
            <div className="mt-1 text-sm font-semibold text-foreground">Global reach</div>
            <div className="mt-1 h-1.5 w-2/3 rounded bg-muted" />
          </div>
        </div>
      );
    case "ground":
      return (
        <div className="relative h-40 p-4" style={{ background: g.css }}>
          <span className="absolute left-3 top-2 rounded bg-background/80 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">In use</span>
          <div className="absolute bottom-4 left-4 right-4 rounded bg-background/85 p-2 text-sm font-semibold text-foreground">Headline sits on the ground</div>
        </div>
      );
    case "block":
      return (
        <div className={wrap}>{label}
          <div className="w-full rounded-lg p-4 text-white" style={{ background: g.css }}>
            <div className="text-xs opacity-90">GlobalLink</div>
            <div className="mt-1 text-sm font-semibold">One deep block per page</div>
          </div>
        </div>
      );
    case "symbol":
      return (
        <div className={wrap}>{label}
          <svg viewBox="0 0 100 100" className="h-20 w-20" role="img" aria-label="Direction study of the symbol gradient, not the logo artwork">
            <defs><linearGradient id={`${g.id}-x`} x1="0" x2="1">{g.stops.map((s, i) => <stop key={s.hex} offset={i / Math.max(1, g.stops.length - 1)} stopColor={s.hex} />)}</linearGradient></defs>
            <path d="M15 15 L40 15 L50 35 L60 15 L85 15 L62 50 L85 85 L60 85 L50 65 L40 85 L15 85 L38 50 Z" fill={`url(#${g.id}-x)`} />
          </svg>
          <span className="absolute bottom-2 text-[11px] text-muted-foreground">Direction study — use the supplied logo files</span>
        </div>
      );
  }
}
