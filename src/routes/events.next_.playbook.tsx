// /events/next/playbook — the NEXT ecosystem VENUE PLAYBOOK.
//
// London 2026 is where the NEXT signage look was settled. This page turns that
// one-off job into carried-forward knowledge: which sign families are reusable,
// what each family already knows (face shape, copy slots, ground, print note),
// the grounds and in-event views that exist, the house print rules, and the
// signs that still have no family — the gaps worth templating next.

import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Layers, MapPin, Ruler, Image as ImageIcon, ListChecks } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import {
  LONDON_PANELS,
  LONDON_PRINT_SPEC,
  LONDON_STYLES,
  LONDON_VENUE,
  type LondonPanel,
} from "@/lib/next-london-signage";
import {
  LONDON_SCENES,
  sceneProvenance,
  sceneQuad,
  sceneSurfaceLabel,
} from "@/lib/next-london-scenes";
import { lightQualityLabel, sceneLightQuality } from "@/lib/scene-lighting";
import { sceneSpace, spaceLabel } from "@/lib/scene-space";
import {
  NEXT_VENUE_TEMPLATES,
  venueTemplateAudit,
  type VenueTemplateSlot,
} from "@/lib/next-venue-templates";

const SLOT_LABELS: Record<VenueTemplateSlot, string> = {
  lockup: "Lockup",
  headline: "Headline",
  subhead: "Subhead",
  utility: "Wayfinding line",
  qr: "Scannable code",
  pattern: "Repeat pattern",
};

const GROUND_LABELS: Record<string, string> = {
  "house-gradient": "House gradient",
  "division-gradient": "Division gradient",
  "repeat-white": "Press-wall white",
  supplied: "Supplied artwork",
};

export const Route = createFileRoute("/events/next_/playbook")({
  head: () => ({
    meta: [
      { title: "NEXT venue playbook · reusable signage families" },
      {
        name: "description",
        content:
          "The carried-forward NEXT signage knowledge: reusable sign families with face shapes, copy slots, grounds and print notes settled at London 2026, ready to re-trim for the next venue.",
      },
      { property: "og:title", content: "NEXT venue playbook" },
      {
        property: "og:description",
        content:
          "Sixteen reusable NEXT sign families, approved gradient grounds, in-event views and house print rules — so the next venue starts from the settled look instead of a blank page.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlaybookPage,
});

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="text-2xl font-semibold tracking-tight text-[#03002C]">{value}</div>
      <div className="mt-1 text-[12px] text-black/60">{label}</div>
    </div>
  );
}

function mm(n: number) {
  return `${Math.round(n).toLocaleString()} mm`;
}

function PlaybookPage() {
  const audit = useMemo(() => venueTemplateAudit<LondonPanel>(LONDON_PANELS), []);
  const grounds = useMemo(
    () => [...new Set(LONDON_PANELS.map((p) => p.style))].filter((id) => LONDON_STYLES[id]),
    [],
  );
  const photoScenes = useMemo(
    () => LONDON_SCENES.filter((s) => sceneProvenance(s) === "photograph"),
    [],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-1.5 text-xs text-black/55 hover:text-[#003FC7]"
        >
          <ArrowLeft size={13} /> NEXT 2026 hub
        </Link>
        <Link
          to="/events/next/city"
          className="ml-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#003FC7] hover:underline"
        >
          <MapPin size={13} /> Start the next city
        </Link>


        <div className="mt-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E0E8F5] px-2.5 py-1 text-[11px] font-medium text-[#003FC7]">
            <Layers size={12} /> Venue playbook
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#03002C]">
            What the NEXT ecosystem carries forward
          </h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-[1.5] text-black/70">
            {LONDON_VENUE.name} is where this look was settled. Everything below is the reusable
            part of that job — the shape of each face, the copy it carries, how its ground is built
            and what the printer needs to know. A new venue supplies its own sizes and room names
            and gets the same result without deriving it again.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={`${NEXT_VENUE_TEMPLATES.length}`} label="Reusable sign families" />
          <Stat
            value={`${Math.round(audit.reuse * 100)}%`}
            label={`Of the ${audit.total} London signs start from a family`}
          />
          <Stat value={`${grounds.length}`} label="Approved gradient grounds in use" />
          <Stat
            value={`${LONDON_SCENES.length}`}
            label={`In-event views (${photoScenes.length} event photographs)`}
          />
        </div>

        <h2 className="mt-10 flex items-center gap-2 text-lg font-semibold tracking-tight text-[#03002C]">
          <ListChecks size={16} /> Sign families
        </h2>
        <p className="mt-1 text-[13px] text-black/60">
          Each family already knows its substrate, copy slots, ground and print rule. Sizes shown
          are the range it has been produced at so far.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {audit.coverage.map(({ family, panels, sizeRange, bleeds }) => (
            <article
              key={family.id}
              className="flex h-full flex-col rounded-xl border border-black/10 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[15px] font-semibold text-[#03002C]">{family.name}</h3>
                <span className="shrink-0 rounded-full bg-[#F2F2F2] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-black/60">
                  {panels.length} sign{panels.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-black/70">{family.substrate}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {family.slots.map((slot) => (
                  <span
                    key={slot}
                    className="rounded-full border border-[#003FC7]/25 px-2 py-0.5 text-[11px] text-[#003FC7]"
                  >
                    {SLOT_LABELS[slot]}
                  </span>
                ))}
              </div>

              <dl className="mt-3 space-y-1 text-[12px] text-black/65">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-black/45">Ground</dt>
                  <dd>{GROUND_LABELS[family.ground] ?? family.ground}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-black/45">Face</dt>
                  <dd className="capitalize">{family.orientation}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-black/45">Sizes</dt>
                  <dd>
                    {sizeRange
                      ? `${mm(sizeRange.minW)} – ${mm(sizeRange.maxW)} wide · ${mm(sizeRange.minH)} – ${mm(sizeRange.maxH)} high`
                      : "Not yet produced"}
                  </dd>
                </div>
                {bleeds.length ? (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-black/45">Bleed</dt>
                    <dd>{bleeds.map((b) => `${b} mm`).join(" · ")}</dd>
                  </div>
                ) : null}
              </dl>

              <p className="mt-3 flex gap-2 rounded-lg bg-[#F2F2F2] p-2.5 text-[12px] leading-[1.45] text-black/70">
                <Ruler size={13} className="mt-0.5 shrink-0 text-[#003FC7]" />
                <span>{family.printNote}</span>
              </p>

              {panels.length ? (
                <p className="mt-3 text-[11px] text-black/45">
                  Settled on: {panels.slice(0, 3).map((p) => p.name).join(", ")}
                  {panels.length > 3 ? ` +${panels.length - 3} more` : ""}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        <h2 className="mt-10 flex items-center gap-2 text-lg font-semibold tracking-tight text-[#03002C]">
          <ImageIcon size={16} /> Grounds in use
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {grounds.map((id) => {
            const style = LONDON_STYLES[id];
            if (!style) return null;
            return (
              <article key={id} className="rounded-xl border border-black/10 bg-white p-4">
                <div
                  className="h-14 w-full rounded-lg border border-black/10"
                  style={{ background: `linear-gradient(135deg, ${style.stops.join(", ")})` }}
                />
                <h3 className="mt-3 text-[14px] font-semibold text-[#03002C]">{style.label}</h3>
                <p className="mt-1 text-[12px] leading-[1.45] text-black/65">{style.note}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-black/45">
                  {style.stops.join(" → ")}
                </p>
              </article>
            );
          })}
        </div>

        <h2 className="mt-10 text-lg font-semibold tracking-tight text-[#03002C]">
          House print rules
        </h2>
        <p className="mt-1 text-[13px] text-black/60">
          These carry to every venue in the ecosystem, not just London.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {LONDON_PRINT_SPEC.map((rule) => (
            <article key={rule.id} className="rounded-xl border border-black/10 bg-white p-4">
              <h3 className="text-[14px] font-semibold text-[#03002C]">{rule.title}</h3>
              <p className="mt-1 text-[12px] leading-[1.5] text-black/70">{rule.body}</p>
            </article>
          ))}
        </div>

        <h2 className="mt-10 text-lg font-semibold tracking-tight text-[#03002C]">
          Still to template
        </h2>
        {audit.unmatched.length ? (
          <>
            <p className="mt-1 text-[13px] text-black/60">
              {audit.unmatched.length} signs have no reusable family yet. Each one added here is time
              saved at the next venue.
            </p>
            <ul className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {audit.unmatched.map((panel) => (
                <li
                  key={panel.id}
                  className="rounded-lg border border-dashed border-black/15 bg-white px-3 py-2 text-[12px] text-black/70"
                >
                  <span className="font-medium text-[#03002C]">{panel.name}</span>
                  <span className="text-black/45">
                    {" "}
                    · {panel.room} · {mm(panel.trimW)} × {mm(panel.trimH)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-[13px] text-black/60">
            Every sign in the London set now belongs to a reusable family.
          </p>
        )}

        <h2 className="mt-10 text-lg font-semibold tracking-tight text-[#03002C]">
          In-event views the ecosystem can reuse
        </h2>
        <p className="mt-1 text-[13px] text-black/60">
          Artwork is shown mounted on a measured face. Event photographs are marked as such;
          everything else is an honest visualisation.
        </p>
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {LONDON_SCENES.map((scene) => (
            <li
              key={scene.id}
              className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-black/70"
            >
              {sceneSurfaceLabel(scene) ?? scene.label}
              <span
                className={`ml-1.5 font-mono text-[9px] uppercase tracking-[0.1em] ${
                  sceneProvenance(scene) === "photograph" ? "text-[#003FC7]" : "text-black/40"
                }`}
              >
                {sceneProvenance(scene) === "photograph" ? "photo" : "visual"}
              </span>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-lg font-semibold tracking-tight text-[#03002C]">
          How every view is lit and placed in space
        </h2>
        <p className="mt-1 text-[13px] text-black/60">
          Each view carries a photographer's read of its space: time of day, colour temperature of the
          dominant light, and how hard it is. Shadow direction follows the light's bearing and shadow
          length follows its height, so the same warm foyer or stage wash looks the same at every
          venue in the NEXT ecosystem.
        </p>
        <p className="mt-2 text-[13px] text-black/60">
          Each view also records where the camera stood. The surface's own converging edges give the
          horizon, so the lens height and tilt are read from the picture rather than guessed. The end
          of a print that runs deeper into the room is drawn slightly hazier, slightly darker and
          slightly softer than the near end, because that is what distance does — a print treated
          evenly across a raked surface always reads as pasted on.
        </p>
        <p className="mt-2 text-[13px] text-black/60">
          Size comes before looks. Where the install surface has been measured — a supplied artboard,
          a venue drawing, a measured door opening — the print is placed at its true fraction of that
          surface, so a 1000&nbsp;mm panel on a 6800&nbsp;mm scenic wall covers 15% of the wall in the
          view exactly as it will on site. Where the surface has not been measured the view says
          &ldquo;indicative scale&rdquo; instead of pretending, and any item that cannot physically fit
          the surface it is shown on is called out on the view itself.
        </p>
        <ul className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {LONDON_SCENES.map((scene) => {
            const q = sceneLightQuality(scene.id);
            return (
              <li
                key={`light-${scene.id}`}
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[12px] text-black/70"
              >
                <span className="font-medium text-[#03002C]">
                  {sceneSurfaceLabel(scene) ?? scene.label}
                </span>
                <span className="mt-0.5 block text-black/55">{lightQualityLabel(q)}</span>
                <span className="mt-0.5 block font-mono text-[10px] text-black/40">
                  light {Math.round(q.azimuth)}° bearing · {Math.round(q.elevation)}° high · shadow{" "}
                  {q.shadowLength.toFixed(2)}× height
                </span>
                <span className="mt-0.5 block text-[11px] text-black/45">
                  {spaceLabel(sceneSpace(sceneQuad(scene)))}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/events/next/london"
            className="rounded-full bg-[#03002C] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#003FC7]"
          >
            Open the London kit
          </Link>
          <Link
            to="/events/next/london/template"
            className="rounded-full border border-black/15 px-4 py-2 text-[13px] font-medium text-[#03002C] hover:bg-[#F2F2F2]"
          >
            Build from a template
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
