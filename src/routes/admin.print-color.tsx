// PRINT COLOR & PREFLIGHT (master admin)
// ---------------------------------------------------------------------------
// The CMYK gap is a decision queue, not a script. This route surfaces the
// second definition per brand mode — an approved print build per output intent
// — alongside the ink rules and the preflight profile that gates output.
//
// Nothing here converts RGB to CMYK automatically: a saturated blue has no
// single correct process build, so unsigned slots stay pending and preflight
// fails on them.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, Droplets } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPage";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  TEXT_BLACK,
  SMALL_TYPE_PT_CEILING,
  TAC_LIMIT_COATED,
  TAC_LIMIT_UNCOATED,
  cmykString,
  printColorBuilds,
  queueSummary,
  totalAreaCoverage,
  type PrintColorSlot,
  type PrintIntent,
} from "@/lib/print-color-contract";
import {
  BLEED_3MM_IN,
  MIN_IMAGE_DPI,
  MIN_LINEART_DPI,
  PREFLIGHT_PROFILES,
  SOFT_IMAGE_DPI,
  DECK_MEDIA_LONG_EDGE_PX,
} from "@/lib/print-preflight";

export const Route = createFileRoute("/admin/print-color")({
  head: () => ({
    meta: [
      { title: "Print Color & Preflight · Admin · TransPerfect Element" },
      {
        name: "description",
        content:
          "Approved CMYK and spot builds per brand mode, ink rules for body text, bleed geometry, and the preflight profile that gates offset and digital output.",
      },
      { property: "og:title", content: "Print Color & Preflight · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Per-brand print color decision queue, 100K text rule, bleed and safe-area geometry, and the PDF/X-4 preflight gate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrintColorPage,
});

const INTENTS: Array<{ id: PrintIntent; label: string; sub: string }> = [
  { id: "offset", label: "Sheetfed offset", sub: "Spot separations available" },
  { id: "digital", label: "Digital / POD", sub: "Process CMYK only" },
];

function PrintColorPage() {
  const [intent, setIntent] = useState<PrintIntent>("offset");
  const builds = useMemo(() => printColorBuilds(BRAND_MODES), []);
  const forIntent = useMemo(
    () => builds.filter((b) => b.intent === intent),
    [builds, intent],
  );
  const summary = useMemo(() => queueSummary(forIntent), [forIntent]);
  const profile = PREFLIGHT_PROFILES[intent];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <AdminPageHeader
        eyebrow="Print production"
        title="Print color & preflight"
        description="Every brand mode needs a second color definition for print — approved CMYK, or a spot where the brand warrants it. Screen values are never converted automatically."
      />

      {/* Intent switch */}
      <div className="mb-6 flex flex-wrap gap-2">
        {INTENTS.map((i) => (
          <button
            key={i.id}
            type="button"
            onClick={() => setIntent(i.id)}
            className={
              intent === i.id
                ? "rounded-full bg-[#003FC7] px-4 py-2 text-left text-xs font-medium text-white"
                : "rounded-full border border-black/15 bg-white px-4 py-2 text-left text-xs text-black/65 hover:bg-black/[0.04]"
            }
          >
            <span className="block font-semibold">{i.label}</span>
            <span className="block text-[10px] opacity-70">{i.sub}</span>
          </button>
        ))}
      </div>

      {/* Queue summary */}
      <section className="mb-8 grid gap-3 sm:grid-cols-4">
        <Stat label="Slots" value={String(summary.total)} />
        <Stat label="Approved" value={String(summary.approved)} tone="ok" />
        <Stat label="Awaiting sign-off" value={String(summary.pending)} tone="warn" />
        <Stat label="No build authored" value={String(summary.unauthored)} tone="warn" />
      </section>

      {/* Preflight profile */}
      <section className="mb-10 rounded-2xl border border-[#003FC7]/20 bg-[#003FC7]/[0.04] p-5">
        <h2 className="text-sm font-semibold text-[#03002C]">
          Preflight profile — {profile.label}
        </h2>
        <dl className="mt-3 grid gap-3 text-xs text-black/70 sm:grid-cols-3">
          <div>
            <dt className="font-semibold uppercase tracking-[0.16em] text-black/45">Standard</dt>
            <dd className="mt-0.5">{profile.standard}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-[0.16em] text-black/45">
              Output intent
            </dt>
            <dd className="mt-0.5">{profile.icc}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-[0.16em] text-black/45">Bleed</dt>
            <dd className="mt-0.5">
              {BLEED_3MM_IN.toFixed(3)}in (3 mm) + crop marks + safe area
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-black/60">{profile.note}</p>
      </section>

      {/* Ink rules */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-black/55">
          Ink rules
        </h2>
        <ul className="space-y-2 text-sm text-black/75">
          <Rule>
            Body copy and hairline rules separate to <strong>{cmykString(TEXT_BLACK)}</strong>.
            Navy #03002C as a four-color build fringes at small sizes on any registration slip.
          </Rule>
          <Rule>
            Display type at or below <strong>{SMALL_TYPE_PT_CEILING}pt</strong> follows the same
            100K rule; above it a rich or navy build is acceptable.
          </Rule>
          <Rule>
            Rich black for large fills is a <strong>press decision</strong>, not a value this tool
            supplies — the support screen depends on stock and the printer&rsquo;s TAC limit. Ask for
            it alongside the brand build.
          </Rule>

          <Rule>
            Total area coverage caps at <strong>{TAC_LIMIT_COATED}%</strong> coated /{" "}
            <strong>{TAC_LIMIT_UNCOATED}%</strong> uncoated.
          </Rule>
          <Rule>
            Geist embeds legally (OFL, fsType 0) into PDF/X the same way it does into PPTX — an
            unembedded font is a build bug, not a licensing limit.
          </Rule>
        </ul>
      </section>

      {/* Resolution ceiling */}
      <section className="mb-10 rounded-2xl border border-amber-500/30 bg-amber-50/70 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#03002C]">
          <AlertTriangle size={14} className="text-amber-600" /> Media resolution is capped
          upstream
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-black/70">
          Deck media was optimized for file size: anything over{" "}
          {DECK_MEDIA_LONG_EDGE_PX} px on the long edge was resized to roughly 150 DPI across a
          13.33in slide, and a batch of PNGs was re-encoded as JPEG. The pre-optimization
          originals were not retained, so any print piece drawing on that pool is permanently
          limited — no downstream setting recovers it. Preflight reports those placements as
          failures below {SOFT_IMAGE_DPI} DPI and as soft between {SOFT_IMAGE_DPI} and{" "}
          {MIN_IMAGE_DPI} DPI ({MIN_LINEART_DPI} DPI for rasterized line art). New print imagery
          must be acquired at final size and kept unoptimized.
        </p>
      </section>

      {/* Decision queue */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-black/55">
          Decision queue · {intent === "offset" ? "offset" : "digital"}
        </h2>
        <div className="space-y-4">
          {forIntent.map((build) => {
            const brand = BRAND_MODES.find((b) => b.id === build.brandModeId);
            if (!brand) return null;
            return (
              <article
                key={`${build.brandModeId}-${build.intent}`}
                className="rounded-2xl border border-black/10 bg-white p-4"
              >
                <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#03002C]">{brand.name}</h3>
                    <p className="text-xs text-black/55">{brand.description}</p>
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">
                    {build.slots.filter((s) => s.status === "approved").length}/
                    {build.slots.length} approved
                  </div>
                </header>
                <div className="grid gap-2 sm:grid-cols-2">
                  {build.slots.map((slot) => (
                    <SlotCard key={slot.role} slot={slot} />
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SlotCard({ slot }: { slot: PrintColorSlot }) {
  const approved = slot.status === "approved";
  return (
    <div className="rounded-xl border border-black/10 bg-black/[0.015] p-3">
      <div className="flex items-center gap-2">
        <span
          className="h-6 w-6 shrink-0 rounded-md border border-black/10"
          style={{ backgroundColor: slot.sourceHex }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#03002C]">
            <span className="capitalize">{slot.role}</span>
            <span className="font-mono text-[10px] font-normal text-black/45">
              {slot.sourceHex.toUpperCase()}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px]">
            {approved ? (
              <CheckCircle2 size={11} className="text-emerald-600" />
            ) : (
              <CircleDashed size={11} className="text-amber-600" />
            )}
            <span className={approved ? "text-emerald-700" : "text-amber-700"}>
              {approved ? `Approved${slot.approvedBy ? ` · ${slot.approvedBy}` : ""}` : "Awaiting brand sign-off"}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 space-y-1 text-[11px] text-black/65">
        <div className="font-mono">
          {slot.cmyk ? cmykString(slot.cmyk) : "No process build authored"}
          {slot.cmyk ? (
            <span className="ml-1 text-black/40">({totalAreaCoverage(slot.cmyk)}% TAC)</span>
          ) : null}
        </div>
        {slot.spot ? (
          <div className="flex items-center gap-1 text-[#003FC7]">
            <Droplets size={10} /> {slot.spot.name}
            <span className="text-black/45">· fallback {cmykString(slot.spot.fallback)}</span>
          </div>
        ) : null}
        {slot.note ? <p className="text-black/50">{slot.note}</p> : null}
      </div>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 rounded-xl border border-black/10 bg-white p-3 text-xs leading-relaxed">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#003FC7]" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const color =
    tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-[#03002C]";
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight ${color}`}>{value}</div>
    </div>
  );
}
