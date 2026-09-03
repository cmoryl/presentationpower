import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, FileDown, Ruler } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { CityBadge } from "@/components/next/CityBadge";
import {
  BADGE_SPEC,
  CITY_BADGE_DEFAULT,
  CITY_BADGE_DIVISIONS,
  CITY_BADGE_FACES,
  CITY_BADGE_ROLES,
  CITY_BADGE_SOURCE,
  cityBadgeDivision,
  type CityBadgeFaceId,
} from "@/lib/next-city-badge";

export const Route = createFileRoute("/events/next_/badges")({
  validateSearch: (search: Record<string, unknown>) => ({
    division: typeof search.division === "string" ? search.division : undefined,
  }),
  head: () => ({
    meta: [
      { title: "NEXT 2026 attendee badges · Division variations" },
      {
        name: "description",
        content:
          "Every TransPerfect NEXT 2026 division attendee badge on the approved City Series artwork — 4.33″ × 6.3″ dual-slot plastic template with the BLE Klik cutout, dark and light faces.",
      },
      { property: "og:title", content: "NEXT 2026 attendee badges" },
      {
        property: "og:description",
        content:
          "Approved City Series badge artwork with a division lockup swap for every NEXT area, print-ready with PDF, .ai and proof export.",
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

  const [face, setFace] = useState<CityBadgeFaceId>("dark");
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

        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em]">
          NEXT 2026 attendee badges
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Every division area now runs on the approved City Series badge artwork — full bleed on the{" "}
          {BADGE_SPEC.trimW}″ × {BADGE_SPEC.trimH}″ dual-slot plastic template with the BLE Klik
          cutout. Palette and geometry are fixed; only the division lockup and the typeset copy
          change. Open any card to edit copy, save the print run and export PDF, an Illustrator twin
          and a proof PNG.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1 rounded-full border border-border p-1">
            {CITY_BADGE_FACES.map((f) => (
              <button
                key={f.id}
                onClick={() => setFace(f.id)}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  face === f.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
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
          <a
            href={CITY_BADGE_SOURCE.ai}
            download
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            <FileDown size={12} /> Source .ai
          </a>
          <a
            href={CITY_BADGE_SOURCE.pdf}
            download
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            <FileDown size={12} /> Source PDF
          </a>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {divisions.map((div) => {
            const resolved = cityBadgeDivision(div.id);
            return (
              <article
                key={div.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex justify-center overflow-hidden rounded-xl bg-[#03002C] p-3">
                  <CityBadge
                    config={{
                      ...CITY_BADGE_DEFAULT,
                      face,
                      divisionId: div.id,
                      roleLabel,
                    }}
                    ppi={PREVIEW_PPI}
                    guides={guides}
                    style={{ borderRadius: 4 }}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">{resolved.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {BADGE_SPEC.trimW}″ × {BADGE_SPEC.trimH}″ trim · bleed {BADGE_SPEC.bleedW}″ ×{" "}
                    {BADGE_SPEC.bleedH}″
                  </p>
                </div>
                <Link
                  to="/events/next/city-badges"
                  search={{ division: div.id, face }}
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
