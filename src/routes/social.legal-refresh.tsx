// /social/legal-refresh — the Legal creative refresh campaign board.
//
// Authored from the September 2026 Legal creative refresh design brief:
// one proposition, four headline variations, four distinct art directions,
// each rendered as a real LinkedIn single-image ad plus a square trim.

import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Ban, Check, Share2, Sparkles } from "lucide-react";
import { LegalRefreshAd } from "@/components/social/LegalRefreshAd";
import {
  LEGAL_REFRESH_CONCEPT,
  LEGAL_REFRESH_DIRECTIONS,
  LEGAL_REFRESH_FORBIDDEN,
  LEGAL_REFRESH_RENDER_MODES,
  LEGAL_REFRESH_SIZES,
  legalRefreshModeUsesPhoto,
  type LegalRefreshRenderMode,
} from "@/lib/social-legal-refresh";

export const Route = createFileRoute("/social/legal-refresh")({
  head: () => ({
    meta: [
      { title: "Legal creative refresh · Four look & feel directions · TransPerfect Element" },
      {
        name: "description",
        content:
          "Four design-led look and feel directions for the TransPerfect Legal LinkedIn campaign — 'We're here for the thorny work' — rendered at LinkedIn single-image and square sizes.",
      },
      { property: "og:title", content: "Legal creative refresh · Four look & feel directions" },
      {
        property: "og:description",
        content:
          "One proposition, four headline variations, four distinct art directions for the TransPerfect Legal LinkedIn test.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <LegalRefreshView />
    </AppShell>
  ),
});

function LegalRefreshView() {
  const [sizeId, setSizeId] = useState<string>(LEGAL_REFRESH_SIZES[0].id);
  const size = LEGAL_REFRESH_SIZES.find((s) => s.id === sizeId) ?? LEGAL_REFRESH_SIZES[0];
  const [mode, setMode] = useState<LegalRefreshRenderMode>("photo");

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 text-xs text-black/50">
        <Link to="/social" className="inline-flex items-center gap-1 hover:text-[#003FC7]">
          <ArrowLeft size={12} /> All playbooks
        </Link>
        <span aria-hidden>·</span>
        <span>{LEGAL_REFRESH_CONCEPT.division}</span>
      </div>

      {/* Concept */}
      <header className="rounded-3xl border border-black/10 bg-gradient-to-br from-[#003FC714] via-white/70 to-[#C2A3FF1A] p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
          <Share2 size={12} /> Legal · {LEGAL_REFRESH_CONCEPT.channel}
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#03002C] sm:text-5xl">
          {LEGAL_REFRESH_CONCEPT.line}
        </h1>
        <p className="mt-2 text-xl text-black/70">{LEGAL_REFRESH_CONCEPT.support}</p>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-black/65">
          {LEGAL_REFRESH_CONCEPT.narrative}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {LEGAL_REFRESH_CONCEPT.rules.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#003FC7]/25 bg-white/80 px-3 py-1 text-xs text-[#03002C]"
            >
              <Check size={12} className="text-[#003FC7]" /> {r}
            </span>
          ))}
        </div>
      </header>

      {/* Size switch */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
              Look &amp; feel
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#03002C]">
              Eight directions, eight compositions
            </h2>
            <p className="max-w-2xl text-sm text-black/60">
              Every direction has its own frame — where the copy sits, how the art is cropped and
              how the footer reads all change, so this is eight designs rather than eight colourways
              of one. Each carries one of the approved headlines. Switch art concept to see the same
              eight ideas as photography, cinematic film stills, hand-drawn ink and wash, two-ink
              riso print, cut-paper collage, or the drawn device alone.
            </p>


          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {LEGAL_REFRESH_RENDER_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={m.id === mode}
                title={m.note}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  m.id === mode
                    ? "border-[#03002C] bg-[#03002C] text-white"
                    : "border-black/15 bg-white text-[#03002C] hover:border-[#003FC7]/50"
                }`}
              >
                {m.label}
              </button>
            ))}
            <span aria-hidden className="mx-1 self-center text-black/20">
              |
            </span>
            {LEGAL_REFRESH_SIZES.map((s) => (
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

        <div className="grid gap-8 lg:grid-cols-2">
          {LEGAL_REFRESH_DIRECTIONS.map((d, i) => (
            <article
              key={d.id}
              className="overflow-hidden rounded-3xl border border-black/10 bg-white/80"
            >
              <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
                    Direction {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="text-base font-semibold text-[#03002C]">{d.name}</div>
                </div>
                <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] uppercase tracking-widest text-black/55">
                  {d.tag}
                </span>
              </div>

              <div className="bg-[#F6F7FA] p-5">
                <div className="mx-auto max-w-[560px] overflow-hidden rounded-xl shadow-[0_16px_40px_-22px_rgba(3,0,44,0.45)]">
                  <LegalRefreshAd direction={d} w={size.w} h={size.h} mode={mode} />
                </div>
              </div>

              <div className="space-y-3 px-5 py-4 text-sm">
                <p className="text-black/70">{d.rationale}</p>
                <dl className="grid gap-2 text-xs text-black/65 sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold uppercase tracking-widest text-black/40">
                      {legalRefreshModeUsesPhoto(mode) ? "Artwork" : "Device"}
                    </dt>
                    <dd className="mt-0.5">
                      {legalRefreshModeUsesPhoto(mode) ? d.photo.note : d.motifNote}
                      {legalRefreshModeUsesPhoto(mode) ? (
                        <span className="block text-black/45">
                          {LEGAL_REFRESH_RENDER_MODES.find((m) => m.id === mode)?.label}:{" "}
                          {LEGAL_REFRESH_RENDER_MODES.find((m) => m.id === mode)?.note}
                        </span>
                      ) : null}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-semibold uppercase tracking-widest text-black/40">Type</dt>
                    <dd className="mt-0.5">{d.type}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold uppercase tracking-widest text-black/40">
                      Composition
                    </dt>
                    <dd className="mt-0.5">{d.layoutNote}</dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {(
                    [
                      ["Ground", d.palette.ground],
                      ["Ink", d.palette.ink],
                      ["Accent", d.palette.accent],
                      ["Second", d.palette.second],
                    ] as const
                  ).map(([label, hex]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-6 rounded-md border border-black/15"
                        style={{ background: hex }}
                      />
                      <span className="text-[10px] leading-tight text-black/55">
                        {label}
                        <br />
                        <span className="font-mono uppercase">{hex}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Guardrails */}
      <section className="rounded-3xl border border-black/10 bg-white/70 p-6">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
          Ruled out by the brief
        </div>
        <h2 className="mt-1 text-xl font-semibold text-[#03002C]">
          None of these appear in any direction
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LEGAL_REFRESH_FORBIDDEN.map((f) => (
            <li
              key={f}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-black/70"
            >
              <Ban size={13} className="shrink-0 text-[#E53D2E]" /> {f}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          to="/social/demo/$playbookId"
          params={{ playbookId: "legal-thorny-work" }}
          className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2 text-sm font-medium text-white hover:bg-[#003FC7]"
        >
          <Sparkles size={14} /> Open the full campaign kit
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
