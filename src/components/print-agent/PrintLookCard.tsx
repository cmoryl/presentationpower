// Visual look-and-feel card: the palette, page mode/format, hero imagery
// candidates and the ordered module plan the print agent intends to use.
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PrintLook = {
  divisionId: string;
  brandName?: string;
  mode: "light" | "dark";
  pageSize?: string;
  density?: string;
  rationale?: string;
  palette?: { primary?: string; accent?: string; surface?: string; ink?: string };
  heroOptions?: { label: string; url?: string; note?: string; recommended?: boolean }[];
  modules?: {
    moduleId?: string;
    label: string;
    resolvedLabel?: string;
    family?: string | null;
    variantId?: string | null;
    density?: string | null;
    note?: string;
  }[];
};

export function printLookFromTool(part: unknown): PrintLook | null {
  const out = (part as { output?: unknown } | null)?.output as { look?: PrintLook } | undefined;
  const look = out?.look;
  if (!look || typeof look !== "object" || !look.divisionId) return null;
  return look;
}

function Swatch({ hex, name }: { hex?: string; name: string }) {
  if (!hex) return null;
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="size-6 rounded-md border border-border"
        style={{ background: hex }}
      />
      <span className="text-[11px] leading-tight text-muted-foreground">
        {name}
        <br />
        <span className="font-mono uppercase">{hex}</span>
      </span>
    </div>
  );
}

export function PrintLookCard({
  look,
  onPick,
}: {
  look: PrintLook;
  onPick?: (text: string) => void;
}) {
  const heroes = look.heroOptions ?? [];
  const modules = look.modules ?? [];
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Palette className="size-4 text-primary" aria-hidden />
        <p className="text-sm font-semibold">
          Look &amp; feel — {look.brandName ?? look.divisionId}
        </p>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {look.mode === "dark" ? "Dark pages" : "Light pages"}
        {look.pageSize ? ` · ${look.pageSize}` : ""}
        {look.density ? ` · ${look.density} density` : ""}
      </p>
      {look.rationale ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{look.rationale}</p>
      ) : null}

      {look.palette ? (
        <div className="mt-3 flex flex-wrap gap-4">
          <Swatch hex={look.palette.primary} name="Primary" />
          <Swatch hex={look.palette.accent} name="Accent" />
          <Swatch hex={look.palette.surface} name="Surface" />
          <Swatch hex={look.palette.ink} name="Ink" />
        </div>
      ) : null}

      {heroes.length > 0 ? (
        <>
          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Hero imagery
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {heroes.map((h, i) => (
              <div key={`${h.label}-${i}`} className="overflow-hidden rounded-lg border border-border">
                {h.url ? (
                  <img
                    src={h.url}
                    alt={h.label}
                    loading="lazy"
                    className="h-20 w-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="h-20 w-full"
                    style={{
                      background: `linear-gradient(135deg, ${look.palette?.primary ?? "#03002C"}, ${
                        look.palette?.accent ?? "#003FC7"
                      })`,
                    }}
                  />
                )}
                <div className="p-2">
                  <p className="truncate text-[11px] font-medium">
                    {h.label}
                    {h.recommended ? " ·  ★" : ""}
                  </p>
                  {h.note ? (
                    <p className="line-clamp-2 text-[10px] text-muted-foreground">{h.note}</p>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-1.5 h-6 w-full text-[10px]"
                    onClick={() => onPick?.(`Use the "${h.label}" hero image for the hero area.`)}
                  >
                    Use this hero
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {modules.length > 0 ? (
        <>
          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Sections in play
          </p>
          <ol className="mt-2 space-y-1.5">
            {modules.map((m, i) => (
              <li key={`${m.label}-${i}`} className="flex gap-2 text-xs">
                <span className="w-5 shrink-0 tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="font-medium">{m.resolvedLabel ?? m.label}</span>
                  {m.variantId ? (
                    <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                      {m.variantId}
                    </span>
                  ) : null}
                  {m.density ? (
                    <span className="ml-1 text-[10px] text-muted-foreground">{m.density}</span>
                  ) : null}
                  {m.note ? <span className="text-muted-foreground"> — {m.note}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button size="sm" className="h-7 text-[11px]" onClick={() => onPick?.("Apply this look and build it.")}>
          Apply this look
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[11px]"
          onClick={() => onPick?.(`Show me the ${look.mode === "dark" ? "light" : "dark"} version instead.`)}
        >
          Try {look.mode === "dark" ? "light" : "dark"}
        </Button>
      </div>
    </div>
  );
}
