// /social/legal-alongside — the "You're not on it alone." Legal campaign board.
//
// Sixteen commissioned documentary frames, each with its own headline and
// caption, rendered through nine switchable layout templates and three trims.

import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Images, Share2 } from "lucide-react";
import { AlongsideAd } from "@/components/social/AlongsideAd";
import {
  LEGAL_ALONGSIDE_CONCEPT,
  LEGAL_ALONGSIDE_SCENES,
  LEGAL_ALONGSIDE_SIZES,
  LEGAL_ALONGSIDE_TEMPLATES,
  LEGAL_ALONGSIDE_TYPE,
  type AlongsideTemplateId,
} from "@/lib/social-legal-alongside";

export const Route = createFileRoute("/social/legal-alongside")({
  head: () => ({
    meta: [
      { title: "You're not on it alone · Legal campaign board · TransPerfect Element" },
      {
        name: "description",
        content:
          "Sixteen commissioned documentary frames for the TransPerfect Legal campaign — one expert committed to something hard, one person already in position — with headline, caption and nine switchable layout templates.",
      },
      { property: "og:title", content: "You're not on it alone · Legal campaign board" },
      {
        property: "og:description",
        content:
          "Sixteen documentary frames, sixteen headlines, six layout templates and three trims for the TransPerfect Legal LinkedIn set.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <AlongsideView />
    </AppShell>
  ),
});

function AlongsideView() {
  const [template, setTemplate] = useState<AlongsideTemplateId>("editorial");
  const [sizeId, setSizeId] = useState<string>(LEGAL_ALONGSIDE_SIZES[0].id);
  const [perScene, setPerScene] = useState<Record<string, AlongsideTemplateId>>({});
  const size = LEGAL_ALONGSIDE_SIZES.find((s) => s.id === sizeId) ?? LEGAL_ALONGSIDE_SIZES[0];

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 text-xs text-black/50">
        <Link to="/social" className="inline-flex items-center gap-1 hover:text-[#003FC7]">
          <ArrowLeft size={12} /> All playbooks
        </Link>
        <span aria-hidden>·</span>
        <span>{LEGAL_ALONGSIDE_CONCEPT.division}</span>
      </div>

      <header className="rounded-3xl border border-black/10 bg-gradient-to-br from-[#003FC714] via-white/70 to-[#C2A3FF1A] p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
          <Share2 size={12} /> Legal · {LEGAL_ALONGSIDE_CONCEPT.channel}
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#03002C] sm:text-5xl">
          {LEGAL_ALONGSIDE_CONCEPT.line}
        </h1>
        <p className="mt-2 text-xl text-black/70">{LEGAL_ALONGSIDE_CONCEPT.support}</p>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-black/65">
          {LEGAL_ALONGSIDE_CONCEPT.narrative}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {LEGAL_ALONGSIDE_CONCEPT.rules.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#003FC7]/25 bg-white/80 px-3 py-1 text-xs text-[#03002C]"
            >
              <Check size={12} className="text-[#003FC7]" /> {r}
            </span>
          ))}
        </div>
      </header>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
              Layout template
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#03002C]">
              Sixteen frames, nine layouts, three trims
            </h2>
            <p className="max-w-2xl text-sm text-black/60">
              Pick a layout for the whole set here, or click the small layout buttons on any single
              card to try that frame in a different template without changing the rest.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {LEGAL_ALONGSIDE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTemplate(t.id);
                  setPerScene({});
                }}
                aria-pressed={t.id === template}
                title={t.note}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  t.id === template
                    ? "border-[#03002C] bg-[#03002C] text-white"
                    : "border-black/15 bg-white text-[#03002C] hover:border-[#003FC7]/50"
                }`}
              >
                {t.label}
              </button>
            ))}
            <span aria-hidden className="mx-1 self-center text-black/20">
              |
            </span>
            {LEGAL_ALONGSIDE_SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSizeId(s.id)}
                aria-pressed={s.id === sizeId}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  s.id === sizeId
                    ? "border-[#003FC7] bg-[#003FC7] text-white"
                    : "border-black/15 bg-white text-[#03002C] hover:border-[#003FC7]/50"
                }`}
              >
                {s.label}
                <span className={s.id === sizeId ? "ml-2 text-white/70" : "ml-2 text-black/40"}>
                  {s.w}×{s.h}
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-black/55">
          {LEGAL_ALONGSIDE_TEMPLATES.find((t) => t.id === template)?.note}{" "}
          <span className="text-black/40">— {LEGAL_ALONGSIDE_TYPE[template].note}</span>
        </p>

        <div className="grid gap-8 lg:grid-cols-2">
          {LEGAL_ALONGSIDE_SCENES.map((scene) => {
            const active = perScene[scene.id] ?? template;
            return (
              <article
                key={scene.id}
                className="overflow-hidden rounded-3xl border border-black/10 bg-white/80"
              >
                <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
                      {scene.no} · {scene.pair}
                    </div>
                    <div className="text-base font-semibold text-[#03002C]">{scene.theme}</div>
                  </div>
                  <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] uppercase tracking-widest text-black/55">
                    {LEGAL_ALONGSIDE_TEMPLATES.find((t) => t.id === active)?.label}
                  </span>
                </div>

                <div className="bg-[#F6F7FA] p-5">
                  <div className="mx-auto max-w-[560px] overflow-hidden rounded-xl shadow-[0_16px_40px_-22px_rgba(3,0,44,0.45)]">
                    <AlongsideAd scene={scene} template={active} w={size.w} h={size.h} />
                  </div>
                </div>

                <div className="space-y-3 px-5 py-4 text-sm">
                  <p className="text-base font-semibold leading-snug text-[#03002C]">
                    {scene.headline}
                  </p>
                  <p className="text-black/70">{scene.caption}</p>
                  <p className="text-xs text-black/45">{scene.craft}</p>
                  <p className="text-xs text-black/55">
                    <span className="font-semibold uppercase tracking-widest text-black/40">
                      Type
                    </span>{" "}
                    {LEGAL_ALONGSIDE_TYPE[active].note} Emphasis on “{scene.action}”.
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="inline-flex items-center gap-1 pr-1 text-[10px] font-semibold uppercase tracking-widest text-black/40">
                      <Images size={12} /> Layout
                    </span>
                    {LEGAL_ALONGSIDE_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        title={t.note}
                        aria-pressed={t.id === active}
                        onClick={() =>
                          setPerScene((prev) => ({ ...prev, [scene.id]: t.id }))
                        }
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                          t.id === active
                            ? "border-[#003FC7] bg-[#003FC7] text-white"
                            : "border-black/15 bg-white text-[#03002C] hover:border-[#003FC7]/50"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          to="/social/legal-refresh"
          className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2 text-sm font-medium text-white hover:bg-[#003FC7]"
        >
          Thorny work directions <ArrowRight size={14} />
        </Link>
        <Link
          to="/social"
          className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-5 py-2 text-sm font-medium text-[#03002C] hover:border-[#003FC7]/50"
        >
          Back to social <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
