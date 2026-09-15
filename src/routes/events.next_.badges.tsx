import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Ruler } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { CityBadge } from "@/components/next/CityBadge";
import {
  BADGE_SPEC,
  CITY_BADGE_DEFAULT,
  CITY_BADGE_DIVISIONS,
  CITY_BADGE_FACE,
  CITY_BADGE_ROLES,
  cityBadgeDivision,
} from "@/lib/next-city-badge";

export const Route = createFileRoute("/events/next_/badges")({
  validateSearch: (search: Record<string, unknown>) => ({
    division: typeof search.division === "string" ? search.division : undefined,
  }),
  head: () => ({
    meta: [
      { title: "NEXT attendee badges · One template, every division" },
      {
        name: "description",
        content:
          "Every TransPerfect NEXT division attendee badge on the one approved NEXT template — front and back on the 4.33″ × 6.3″ dual-slot plastic sheet with the BLE Klik cutout.",
      },
      { property: "og:title", content: "NEXT attendee badges" },
      {
        property: "og:description",
        content:
          "The approved NEXT badge template with front and back live versions for every division area, print-ready with PDF, .ai and proof export.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BadgesPage,
});

const PREVIEW_PPI = 34;

function BadgesPage() {
  const { division: divisionParam } = Route.useSearch();
  const divisions = useMemo(() => {
    if (!divisionParam) return CITY_BADGE_DIVISIONS;
    const one = CITY_BADGE_DIVISIONS.find((d) => d.id === divisionParam);
    return one ? [one] : CITY_BADGE_DIVISIONS;
  }, [divisionParam]);

  const [guides, setGuides] = useState(false);
  const [roleLabel, setRoleLabel] = useState(CITY_BADGE_DEFAULT.roleLabel);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={14} /> NEXT 2026 kit
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em]">NEXT attendee badges</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          One approved NEXT template now covers NEXT and every sub-NEXT event — the violet-to-blue
          ascent ground with the chevron stack, full bleed on the {BADGE_SPEC.trimW}″ ×{" "}
          {BADGE_SPEC.trimH}″ dual-slot plastic template with the BLE Klik cutout. Every division
          area has a live front and back carrying its own white-with-accent lockup; the older dark,
          light and City Series badge templates are retired. Open any card to edit copy, save the
          print run and export PDF, an Illustrator twin and a proof PNG.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-2 text-muted-foreground">
            Role
            <select
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
            >
              {CITY_BADGE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />
            Bleed / trim / safe-area guides
          </label>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-muted-foreground">
            <Ruler size={12} /> {BADGE_SPEC.colorMode} · {BADGE_SPEC.minImageDpi} ppi ·{" "}
            {BADGE_SPEC.exportPreset}
          </span>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {divisions.map((div) => {
            const resolved = cityBadgeDivision(div.id);
            return (
              <article
                key={div.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex justify-center gap-2 overflow-hidden rounded-xl bg-[#03002C] p-3">
                  {(["front", "back"] as const).map((side) => (
                    <CityBadge
                      key={side}
                      config={{
                        ...CITY_BADGE_DEFAULT,
                        divisionId: div.id,
                        roleLabel,
                      }}
                      side={side}
                      ppi={PREVIEW_PPI}
                      guides={guides}
                      style={{ borderRadius: 4 }}
                    />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-medium">{resolved.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Front + back · {BADGE_SPEC.trimW}″ × {BADGE_SPEC.trimH}″ trim · bleed{" "}
                    {BADGE_SPEC.bleedW}″ × {BADGE_SPEC.bleedH}″
                  </p>
                </div>
                <Link
                  to="/events/next/city-badges"
                  search={{ division: div.id, face: CITY_BADGE_FACE.id }}
                  className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  Edit + export this badge <ArrowRight size={12} />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
