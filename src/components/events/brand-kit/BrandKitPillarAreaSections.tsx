// Brand kit: pillar options and floor-plan area options, read from the live registries.
import { DIVISION_LIVE_SIGNS, PILLAR_SIZES_IN } from "@/lib/legal-next-signage";
import { PILLAR_ARROW_STYLES, pillarArrowPath } from "@/lib/pillar-arrows";
import { AREA_KIND_CHOICES, MIN_AREA_M } from "@/lib/next-london-floormap-areas";
import { AREA_ICONS } from "@/lib/next-london-floormap-icons";
import { NEXT_DIVISIONS } from "@/lib/next-brand-guide";

export const PILLAR_AREA_SECTIONS = [
  ["pillars", "Pillar options"],
  ["areas", "Area options"],
] as const;

const PILLAR_PRACTICES = [
  "Measure every pillar on the site survey; pick the preset only if it matches, otherwise enter a custom trim.",
  "One headline per face, set in Geist Bold, white on the ground. Keep it the same visual length as WELCOME across a set.",
  "Rotated headlines read bottom to top. Keep them clear of the lockup and the bottom 12 in (hidden by people and furniture).",
  "Use one arrow style per venue. Solid block for long sight lines; chevron or triangle for tight or premium spaces.",
  "Arrows point to the destination from where the delegate stands, not from the plan view. Check each one on site.",
  "Keep the lockup at the top, at the supplied size. Never stretch, recolour or put it on a busy area of the ground.",
  "Every pillar uses the same ramp direction. The ground carries ⅛ in bleed past the trim.",
  "QR codes go at chest height (40–60 in), at least 1.5 in square, on a flat colour, and are test-scanned before print.",
];

const AREA_PRACTICES = [
  "Use the venue's room names exactly as issued; never invent or shorten them on the map.",
  `Draw areas only where the space is real and at least ${MIN_AREA_M} m across.`,
  "One icon per kind of space, used the same way on the map, the key and the signs.",
  "Name every area people walk to (stage, coffee, demo, help desk); leave storage and service areas off public maps.",
  "Keep walkways and exits clear on the plan — a sign or booth never sits in a marked walkway.",
  "Match each area to its sign: a stage area gets a room pillar, a demo area its demo booth, coffee its NEXTbrew sign.",
];

export function BrandKitPillarAreaSections() {
  const pillars = DIVISION_LIVE_SIGNS.filter((s) => /pillar/i.test(s.title));
  const byDivision = NEXT_DIVISIONS.map((d) => ({ d, items: pillars.filter((p) => p.division === d.id) })).filter((x) => x.items.length);

  return (
    <>
      <section id="pillars" className="mt-12 scroll-mt-16">
        <h2 className="text-xl font-semibold">Pillar options</h2>
        <p className="mt-1 text-sm text-muted-foreground">{pillars.length} editable pillar templates. Every one can be resized and exported as a print file.</p>

        <h3 className="mt-6 text-sm font-semibold">Sizes</h3>
        <ul className="mt-2 flex flex-wrap gap-3">
          {PILLAR_SIZES_IN.map((s) => (
            <li key={s.label} className="flex items-end gap-2 rounded-lg border border-border p-3">
              <span className="block rounded-sm bg-primary" style={{ width: s.w * 0.6, height: s.h * 0.6 }} aria-hidden />
              <span className="text-xs">{s.label}<br /><span className="text-muted-foreground">ratio 1 : {(s.h / s.w).toFixed(2)}</span></span>
            </li>
          ))}
          <li className="self-center text-xs text-muted-foreground">Custom size: any measured trim, in inches.</li>
        </ul>

        <h3 className="mt-6 text-sm font-semibold">Arrow styles</h3>
        <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PILLAR_ARROW_STYLES.map((a) => (
            <li key={a.id} className="flex gap-3 rounded-lg border border-border p-3">
              <svg viewBox="0 0 100 100" className="size-12 shrink-0 rounded bg-primary p-1.5 fill-primary-foreground" aria-hidden>
                <path d={pillarArrowPath(a.id)} />
              </svg>
              <div><p className="text-sm font-semibold">{a.label}</p><p className="text-xs leading-relaxed text-muted-foreground">{a.note}</p></div>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-sm font-semibold">Templates by division</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {byDivision.map(({ d, items }) => (
            <li key={d.id}><span className="font-semibold">{d.name}</span> ({items.length}): <span className="text-muted-foreground">{items.map((p) => p.title.replace(/^.*?NEXT\s*/i, "").replace(/\s*pillar$/i, "")).join(", ")}</span></li>
          ))}
        </ul>

        <h3 className="mt-6 text-sm font-semibold">Best practices</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{PILLAR_PRACTICES.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>

      <section id="areas" className="mt-12 scroll-mt-16">
        <h2 className="text-xl font-semibold">Area options</h2>
        <p className="mt-1 text-sm text-muted-foreground">The kinds of space a team can mark on a floor plan. Each has one icon used on maps, keys and signs.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AREA_KIND_CHOICES.map((k) => (
            <li key={k} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <svg viewBox="0 0 24 24" className="size-7 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={AREA_ICONS[k].path} />
              </svg>
              <span className="text-sm">{AREA_ICONS[k].label}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-6 text-sm font-semibold">Best practices</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{AREA_PRACTICES.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>
    </>
  );
}
