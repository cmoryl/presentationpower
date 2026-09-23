// Backgrounds & gradients block for a division brand guide: the NEXT 2026
// measured house grounds plus, for a division with an event accent, the same
// treatments with that division's accent tinted into the light end. Read-only;
// everything comes from the London ground builders.

import { LONDON_PACK_GROUNDS } from "@/lib/next-london-pack-grounds";
import { LONDON_STYLES } from "@/lib/next-london-signage";
import { londonGroundInfo } from "@/lib/next-london-gradient-info";
import { LONDON_DIVISION_ACCENTS } from "@/lib/next-london-division";

/** Brand guide slug → the event accent family it prints with. */
export const GUIDE_GROUND_FAMILY: Record<string, string | null> = {
  "transperfect-master": null,
  globallink: "globallink",
  "transperfect-life-sciences": "lifesci",
  "transperfect-legal": "legal",
  "transperfect-media": "media",
  "transperfect-gaming": "games",
  "transperfect-digital": "digital",
  dataforce: "dataforce",
};

export function guideHasGrounds(slug: string): boolean {
  return slug in GUIDE_GROUND_FAMILY;
}

export function GuideGrounds({ slug }: { slug: string }) {
  const family = GUIDE_GROUND_FAMILY[slug] ?? null;
  const accent = family ? LONDON_DIVISION_ACCENTS[family] : null;
  const styles = Object.keys(LONDON_STYLES);
  return (
    <div className="space-y-8">
      {accent && family && (
        <div>
          <h3 className="text-base font-semibold">{accent.label} event grounds</h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            NEXT 2026 treatments with the {accent.label} accent ({accent.hex}) tinted into the light
            end. The dark head stays untouched so the white lockup keeps full contrast. Event use
            only — everyday {accent.label} work stays in the enterprise palette.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {styles.map((id) => {
              const g = londonGroundInfo(id, family, []);
              return (
                <div key={id} className="overflow-hidden rounded-xl border border-border">
                  <div className="h-20" style={{ background: g.css }} />
                  <div className="p-3 text-xs">
                    <div className="font-semibold text-foreground">{g.styleLabel}</div>
                    <div className="mt-1 font-mono text-muted-foreground">
                      {g.colors.map((c) => c.hex).join(" → ")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div>
        <h3 className="text-base font-semibold">House event grounds</h3>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          The three grounds measured from the NEXT 2026 London print files, shared by every division.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {LONDON_PACK_GROUNDS.map((g) => (
            <div key={g.id} className="overflow-hidden rounded-xl border border-border">
              <div
                className="h-20"
                style={{ background: `linear-gradient(135deg, ${g.stops.map((x) => x.hex).join(", ")})` }}
              />
              <div className="p-3 text-xs">
                <div className="font-semibold text-foreground">{g.label}</div>
                <ul className="mt-1 space-y-0.5 font-mono text-muted-foreground">
                  {g.stops.map((x) => (
                    <li key={x.hex}>
                      {x.hex} · C{x.cmyk.c} M{x.cmyk.m} Y{x.cmyk.y} K{x.cmyk.k}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
