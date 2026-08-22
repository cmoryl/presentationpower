import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { ArrowRight, Presentation, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { useDeckStore } from "@/lib/deck-store";
import { SHOWCASE_DECKS, getShowcaseDeck } from "@/lib/showcase-decks";
import { MODULE_VARIANTS, SECTION_FRAMEWORKS, byId } from "@/lib/taxonomy";
import { showcaseArt } from "@/lib/showcase-art";
import {
  DEMO_DIVISIONS,
  retargetPayload,
  type DemoDivision,
} from "@/lib/showcase-division";

export const Route = createFileRoute("/demo/deck/$demoId")({
  loader: ({ params }) => {
    const def = getShowcaseDeck(params.demoId);
    if (!def) throw notFound();
    return { name: def.name, blurb: def.blurb, eyebrow: def.eyebrow };
  },
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.eyebrow} · ${loaderData.name} demo deck`
      : "Demo deck · Element";
    const description =
      loaderData?.blurb ??
      "A fully authored example deck you can open, edit, present and export.";
    return {
      meta: [
        { title: `${title} · Element` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ShowcaseDeckDemoPage,
});

function nativeDivision(divisionLabel: string): DemoDivision {
  const match = DEMO_DIVISIONS.find(
    (d) => divisionLabel.includes(d.name) || divisionLabel.includes(d.label),
  );
  return match ?? DEMO_DIVISIONS[0];
}

function ShowcaseDeckDemoPage() {
  const { demoId } = Route.useParams();
  const def = getShowcaseDeck(demoId);
  const navigate = useNavigate();
  const createDeckFromTemplate = useDeckStore((s) => s.createDeckFromTemplate);

  const home = def ? nativeDivision(def.divisionLabel) : DEMO_DIVISIONS[0];
  const [divisionId, setDivisionId] = useState(home.id);
  const division =
    DEMO_DIVISIONS.find((d) => d.id === divisionId) ?? home;

  const payload = useMemo(() => {
    if (!def) return null;
    const base = def.build();
    return division.id === home.id ? base : retargetPayload(base, division);
  }, [def, division, home.id]);

  const existingId = useDeckStore((s) =>
    payload ? Object.values(s.decks).find((d) => d.title === payload.title)?.id : undefined,
  );

  if (!def || !payload) return null;
  const accent = division.accent;

  function open() {
    if (existingId) {
      void navigate({ to: "/decks/$deckId", params: { deckId: existingId } });
      return;
    }
    const { deckId } = createDeckFromTemplate(payload!);
    void navigate({ to: "/decks/$deckId", params: { deckId } });
  }

  /** Replace an older saved copy with the current demo build so decks
   *  generated before an authoring update pick up imagery and backdrops. */
  function regenerate() {
    if (existingId) deleteDeck(existingId);
    const { deckId } = createDeckFromTemplate(payload!);
    void navigate({ to: "/decks/$deckId", params: { deckId } });
  }

  return (
    <AppShell>
      <div className="relative overflow-hidden rounded-3xl border border-black/10 dark:border-white/10">
        <img
          src={showcaseArt(demoId).src}
          alt={showcaseArt(demoId).alt}
          width={1536}
          height={1024}
          className="tp-kenburns h-[300px] w-full object-cover sm:h-[440px]"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${accent}F2 0%, ${accent}B0 42%, transparent 88%)`,
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-end gap-3 p-6 sm:p-9">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">
            Element · Presentation demo · {division.label}
          </div>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
            {def.name}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-white/85">{def.blurb}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={open}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#03002C] transition hover:bg-white/90"
            >
              <Sparkles size={15} />
              {existingId
                ? `Open my ${division.label} copy`
                : `Generate for ${division.label}`}
              <ArrowRight size={15} />
            </button>
            {existingId ? (
              <button
                type="button"
                onClick={regenerate}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/50 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                title="Replace your saved copy with the current demo build (imagery, backdrops and all)"
              >
                Regenerate fresh copy
              </button>
            ) : null}
            <Link
              to="/library"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/50 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Browse modules
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
              Division
            </div>
            <p className="mt-1 text-[12px] text-black/55 dark:text-white/55">
              Same narrative, re-branded: brand mode, style pack, copy and generated
              imagery all follow the division you pick.
            </p>
          </div>
          <div className="text-[11px] text-black/45 dark:text-white/45">
            {division.name} · {division.stylePackId.toUpperCase().replace("SKIN-", "")}
          </div>
        </div>
        <div
          role="group"
          aria-label="Choose division"
          className="mt-3 flex flex-wrap gap-2"
        >
          {DEMO_DIVISIONS.map((d) => {
            const on = d.id === division.id;
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={on}
                onClick={() => setDivisionId(d.id)}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
                  on
                    ? "border-transparent text-white"
                    : "border-black/12 text-black/70 hover:border-black/35 dark:border-white/15 dark:text-white/75 dark:hover:border-white/35"
                }`}
                style={on ? { background: d.accent, color: "#0B1020" } : undefined}
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-[3px]"
                  style={{ background: on ? "#0B1020" : d.accent }}
                />
                {d.label}
                {d.id === home.id ? (
                  <span className="text-[10px] uppercase tracking-[0.14em] opacity-70">
                    native
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>


      <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Every slide, already written
          </h2>
          <ol className="mt-4 space-y-2">
            {payload.slides.map((s, i) => {
              const variant = byId(MODULE_VARIANTS, s.variantId);
              const section = byId(SECTION_FRAMEWORKS, s.sectionId);
              const title =
                (s.content.title as string) ??
                (s.content.message as string) ??
                (s.content.quote as string) ??
                variant?.name ??
                s.variantId;
              return (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-3.5 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <span
                    className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-semibold text-white"
                    style={{ background: accent }}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[#03002C] dark:text-white">
                      {title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-black/50 dark:text-white/50">
                      {section?.name ?? s.sectionId} · {variant?.name ?? s.variantId}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
              Ready to ship
            </div>
            <ul className="mt-3 space-y-2 text-sm text-black/70 dark:text-white/70">
              {def.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span
                    aria-hidden
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-[2px]"
                    style={{ background: accent }}
                  />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 font-medium text-[#03002C] dark:text-white">
              <Presentation size={15} /> {division.name}
            </div>
            <dl className="mt-3 space-y-1.5 text-[12px] text-black/60 dark:text-white/60">
              <div className="flex justify-between gap-3">
                <dt>Slides</dt>
                <dd>{payload.slides.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Audience</dt>
                <dd className="text-right">{payload.brief?.audience}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Objective</dt>
                <dd className="text-right">{payload.brief?.meetingObjective}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
              Other demos
            </div>
            <div className="mt-3 space-y-2">
              {SHOWCASE_DECKS.filter((d) => d.id !== def.id).map((d) => (
                <Link
                  key={d.id}
                  to="/demo/deck/$demoId"
                  params={{ demoId: d.id }}
                  className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-black/10 px-3 text-sm transition hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
                >
                  <span>{d.eyebrow} · {d.name}</span>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
