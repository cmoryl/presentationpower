import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { ArrowRight, Presentation, Sparkles } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useDeckStore } from "@/lib/deck-store";
import { SHOWCASE_DECKS, getShowcaseDeck } from "@/lib/showcase-decks";
import { MODULE_VARIANTS, SECTION_FRAMEWORKS, byId } from "@/lib/taxonomy";
import { showcaseArt } from "@/lib/showcase-art";

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

function ShowcaseDeckDemoPage() {
  const { demoId } = Route.useParams();
  const def = getShowcaseDeck(demoId);
  const navigate = useNavigate();
  const createDeckFromTemplate = useDeckStore((s) => s.createDeckFromTemplate);
  const existingId = useDeckStore((s) =>
    def ? Object.values(s.decks).find((d) => d.title === def.deckTitle)?.id : undefined,
  );

  if (!def) return null;
  const payload = def.build();

  function open() {
    if (existingId) {
      void navigate({ to: "/decks/$deckId", params: { deckId: existingId } });
      return;
    }
    const { deckId } = createDeckFromTemplate(def!.build());
    void navigate({ to: "/decks/$deckId", params: { deckId } });
  }

  return (
    <AppShell>
      <div className="relative overflow-hidden rounded-3xl border border-black/10 dark:border-white/10">
        <img
          src={demoPresentationImg}
          alt="An executive team reviewing a finished Element deck on a boardroom display"
          width={1536}
          height={1024}
          className="h-[300px] w-full object-cover sm:h-[380px]"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${def.accent}F2 0%, ${def.accent}B0 42%, transparent 88%)`,
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-end gap-3 p-6 sm:p-9">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">
            Element · Presentation demo
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
              {existingId ? "Open my copy" : "Open editable demo deck"}
              <ArrowRight size={15} />
            </button>
            <Link
              to="/library"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/50 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Browse modules
            </Link>
          </div>
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
                    style={{ background: def.accent }}
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
                    style={{ background: def.accent }}
                  />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 font-medium text-[#03002C] dark:text-white">
              <Presentation size={15} /> {def.divisionLabel}
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
