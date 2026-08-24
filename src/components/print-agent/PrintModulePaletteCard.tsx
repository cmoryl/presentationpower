// "What sections exist" card: every supported module family with all of its
// variations, grouped and clickable so the user can ask for one by name.
import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PrintModulePalette = {
  kind?: string;
  familyCount: number;
  moduleCount: number;
  totalInLibrary: number;
  families: {
    family: string;
    label: string;
    description?: string;
    variants: { moduleId: string; variantId: string; label: string; density: string }[];
  }[];
};

export function printModulePaletteFromTool(part: unknown): PrintModulePalette | null {
  const out = (part as { output?: unknown } | null)?.output as PrintModulePalette | undefined;
  if (!out || !Array.isArray(out.families) || out.families.length === 0) return null;
  return out;
}

const DENSITY_TONE: Record<string, string> = {
  compact: "text-emerald-600",
  standard: "text-muted-foreground",
  tall: "text-amber-600",
};

export function PrintModulePaletteCard({
  palette,
  onPick,
}: {
  palette: PrintModulePalette;
  onPick?: (text: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(palette.families[0]?.family ?? null);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <LayoutGrid className="size-4 text-primary" aria-hidden />
        <p className="text-sm font-semibold">
          Supported sections{palette.kind ? ` for a ${palette.kind.replace(/-/g, " ")}` : ""}
        </p>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {palette.familyCount} families · {palette.moduleCount} variations available
        {palette.moduleCount !== palette.totalInLibrary
          ? ` (of ${palette.totalInLibrary} in the library)`
          : ""}
      </p>

      <div className="mt-3 divide-y divide-border">
        {palette.families.map((f) => {
          const isOpen = open === f.family;
          return (
            <div key={f.family} className="py-2">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : f.family)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="min-w-0">
                  <span className="text-xs font-medium">{f.label}</span>
                  {f.description ? (
                    <span className="ml-1.5 text-[11px] text-muted-foreground">{f.description}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {f.variants.length}
                </span>
              </button>
              {isOpen ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {f.variants.map((v) => (
                    <Button
                      key={v.moduleId}
                      size="sm"
                      variant="outline"
                      className="h-6 gap-1 px-2 text-[10px]"
                      onClick={() => onPick?.(`Add the "${v.label}" section (${v.moduleId}).`)}
                    >
                      {v.label}
                      <span className={DENSITY_TONE[v.density] ?? "text-muted-foreground"}>
                        {v.density}
                      </span>
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
