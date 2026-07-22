import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BRAND_GUIDES, type BrandGuide, type ColorSwatch, type TypeStyle, type LogoRule } from "@/lib/brand-guides";
import { getBrandhubIntel, targetAudienceText, normalizeVoiceValue } from "@/lib/brandhub-intel";
import { listPdfExtractionsForDivision, getPdfExtractionText } from "@/lib/pdf-ingest.functions";
import {
  listImportedDecksForDivision,
  uploadImportedDeck,
  getImportedDeckSlides,
  deleteImportedDeck,
  embedImportedDecks,
  sendImportedSlideToLibrary,
  listLibrarySlideExamples,
  deleteLibrarySlideExample,
  type LibrarySlideExample,
} from "@/lib/imported-decks.functions";
import {
  listDivisionImagery,
  uploadDivisionImagery,
  updateDivisionImagery,
  deleteDivisionImagery,
  type DivisionImageryEntry,
} from "@/lib/division-imagery.functions";
import { DIVISION_IMAGERY } from "@/assets/backdrops/divisions";



export const Route = createFileRoute("/admin/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Browser · Admin · TransPerfect" },
      { name: "description", content: "Browse per-division brand guides, colors, typography, logo rules, BrandHub intel, and voiceover topics." },
    ],
  }),
  component: AdminKnowledgeBrowser,
});

type Tab = "overview" | "colors" | "type" | "logo" | "subbrands" | "intel" | "sources" | "imported" | "imagery" | "voiceover";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "colors", label: "Colors" },
  { id: "type", label: "Typography" },
  { id: "logo", label: "Logo rules" },
  { id: "subbrands", label: "Sub-brands" },
  { id: "intel", label: "BrandHub intel" },
  { id: "sources", label: "Source documents" },
  { id: "imported", label: "Imported decks" },
  { id: "imagery", label: "Imagery" },
  { id: "voiceover", label: "Voiceover topics" },
];




type CanvaPaletteEntry = {
  division: string;
  hex: string;
  rgb: string;
  cmyk: string;
  pantone: string;
};

type VoBeat = { label: string; start: number };
type VoiceoverIndex = { slug: string; beats: VoBeat[]; duration: number };

const VOICEOVER_SLUGS = [
  "adobe", "brief", "canva", "client", "concepts", "critique", "figma",
  "glossary", "howto-brief", "howto-canva", "howto-imagegen", "howto-vision",
  "imagegen", "ip", "moodboard", "naming", "powerpoint", "prompting",
  "research", "resources", "skills", "systems", "videos", "vision",
];

function AdminKnowledgeBrowser() {
  const [slug, setSlug] = useState<string>(BRAND_GUIDES[0]?.slug ?? "transperfect-master");
  const [tab, setTab] = useState<Tab>("overview");
  const [q, setQ] = useState("");
  const [canva, setCanva] = useState<CanvaPaletteEntry[] | null>(null);
  const [voIndex, setVoIndex] = useState<VoiceoverIndex[]>([]);

  const guide = useMemo(() => BRAND_GUIDES.find((g) => g.slug === slug), [slug]);

  const filteredGuides = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return BRAND_GUIDES;
    return BRAND_GUIDES.filter(
      (g) => g.title.toLowerCase().includes(needle) || g.subtitle.toLowerCase().includes(needle) || g.slug.includes(needle),
    );
  }, [q]);

  useEffect(() => {
    fetch("/canva-master-reference/next-2026-color-palette.json")
      .then((r) => r.json())
      .then((d: { palette?: CanvaPaletteEntry[] }) => setCanva(d.palette ?? []))
      .catch(() => setCanva([]));
  }, []);

  useEffect(() => {
    if (tab !== "voiceover" || voIndex.length > 0) return;
    Promise.all(
      VOICEOVER_SLUGS.map((s) =>
        fetch(`/knowledge/voiceover/${s}.json`)
          .then((r) => r.json())
          .then((d: { beats?: VoBeat[]; duration?: number }) => ({
            slug: s,
            beats: d.beats ?? [],
            duration: d.duration ?? 0,
          }))
          .catch(() => ({ slug: s, beats: [], duration: 0 })),
      ),
    ).then(setVoIndex);
  }, [tab, voIndex.length]);

  if (!guide) return <div className="text-sm text-black/60">Guide not found.</div>;

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-black/10 bg-white/70 p-3">
        <div className="mb-2 px-2 text-[10px] uppercase tracking-widest text-black/50">Division</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search guides…"
          className="mb-2 w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs outline-none placeholder:text-black/40 focus:border-black/30"
        />
        <div className="max-h-[70vh] space-y-0.5 overflow-y-auto pr-1">
          {filteredGuides.map((g) => (
            <button
              key={g.slug}
              type="button"
              onClick={() => setSlug(g.slug)}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                g.slug === slug ? "bg-[#05041A] text-white" : "text-black/80 hover:bg-black/[0.04]"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{g.title}</span>
              <span className={`ml-2 shrink-0 text-[9px] uppercase tracking-widest ${g.slug === slug ? "text-white/60" : "text-black/40"}`}>
                {g.category}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div>
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-black/50">{guide.category} · v{guide.version}</div>
            <h2 className="mt-1 text-3xl font-semibold text-black">{guide.title}</h2>
            <p className="mt-1 text-sm text-black/60">{guide.subtitle}</p>
          </div>
          <Link
            to="/knowledge/brand-guides/$slug"
            params={{ slug: guide.slug }}
            target="_blank"
            className="rounded-full border border-black/15 px-3 py-1.5 text-xs text-black/70 hover:border-black/40"
          >
            Public view ↗
          </Link>
        </div>

        <nav className="mt-6 flex flex-wrap gap-1 rounded-2xl border border-black/10 bg-white/60 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-3 py-1.5 text-xs transition ${
                tab === t.id ? "bg-[#05041A] text-white" : "text-black/70 hover:bg-black/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {tab === "overview" && <OverviewTab guide={guide} />}
          {tab === "colors" && <ColorsTab guide={guide} canva={canva} />}
          {tab === "type" && <TypeTab guide={guide} />}
          {tab === "logo" && <LogoTab guide={guide} />}
          {tab === "subbrands" && <SubBrandsTab guide={guide} />}
          {tab === "intel" && <IntelTab slug={guide.slug} />}
          {tab === "sources" && <SourcesTab slug={guide.slug} />}
          {tab === "imported" && <ImportedDecksTab slug={guide.slug} />}
          {tab === "imagery" && <DivisionImageryTab guide={guide} />}

          {tab === "voiceover" && <VoiceoverTab index={voIndex} />}

        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white/70 p-6">
      <div className="mb-3 text-[10px] uppercase tracking-widest text-black/50">{title}</div>
      {children}
    </section>
  );
}

function OverviewTab({ guide }: { guide: BrandGuide }) {
  return (
    <div className="space-y-4">
      {guide.tagline && (
        <div className="rounded-2xl border border-black/10 bg-gradient-to-br from-[#03002C] to-[#003FC7] p-6 text-white">
          <div className="text-[10px] uppercase tracking-widest text-white/60">Tagline</div>
          <div className="mt-2 text-2xl font-semibold leading-tight">{guide.tagline}</div>
        </div>
      )}
      <Section title="Introduction">
        <p className="text-sm leading-relaxed text-black/75">{guide.intro}</p>
      </Section>
      {guide.values && guide.values.length > 0 && (
        <Section title="Values">
          <ul className="grid gap-3 sm:grid-cols-2">
            {guide.values.map((v) => (
              <li key={v.label} className="rounded-lg border border-black/[0.06] bg-white p-3">
                <div className="text-sm font-medium text-black">{v.label}</div>
                <div className="mt-1 text-xs text-black/60">{v.description}</div>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {guide.photography && (
        <Section title="Photography">
          <p className="text-sm leading-relaxed text-black/70">{guide.photography}</p>
        </Section>
      )}
      {guide.brandVisuals && (
        <Section title="Brand visuals">
          <p className="text-sm leading-relaxed text-black/70">{guide.brandVisuals}</p>
        </Section>
      )}
    </div>
  );
}

function Swatch({ s }: { s: ColorSwatch }) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="h-16 w-full" style={{ background: s.hex }} />
      <div className="p-2.5">
        <div className="truncate text-xs font-medium text-black">{s.name}</div>
        <div className="mt-0.5 font-mono text-[10px] uppercase text-black/60">{s.hex}</div>
        {s.role && <div className="mt-1 text-[10px] text-black/50">{s.role}</div>}
        {s.pantone && <div className="text-[10px] text-black/40">Pantone {s.pantone}</div>}
      </div>
    </div>
  );
}

function ColorsTab({ guide, canva }: { guide: BrandGuide; canva: CanvaPaletteEntry[] | null }) {
  const canvaMatch = useMemo(() => {
    if (!canva) return [];
    const needle = guide.title.toLowerCase();
    const firstWord = needle.split(" ")[0] ?? "";
    return canva.filter((c) => needle.includes(c.division.toLowerCase()) || (firstWord && c.division.toLowerCase().includes(firstWord)));
  }, [canva, guide.title]);

  return (
    <div className="space-y-4">
      <Section title={`Primary (${guide.primaryColors.length})`}>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {guide.primaryColors.map((s) => <Swatch key={s.name + s.hex} s={s} />)}
        </div>
      </Section>
      {guide.secondaryColors.length > 0 && (
        <Section title={`Secondary (${guide.secondaryColors.length})`}>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {guide.secondaryColors.map((s) => <Swatch key={s.name + s.hex} s={s} />)}
          </div>
        </Section>
      )}
      {guide.tertiaryColors.length > 0 && (
        <Section title={`Tertiary (${guide.tertiaryColors.length})`}>
          <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {guide.tertiaryColors.map((s) => <Swatch key={s.name + s.hex} s={s} />)}
          </div>
        </Section>
      )}
      {guide.neutrals.length > 0 && (
        <Section title={`Neutrals (${guide.neutrals.length})`}>
          <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {guide.neutrals.map((s) => <Swatch key={s.name + s.hex} s={s} />)}
          </div>
        </Section>
      )}
      <Section title="Canva master reference · Next 2026 palette">
        {canva === null ? (
          <div className="text-xs text-black/50">Loading…</div>
        ) : canvaMatch.length === 0 ? (
          <div className="text-xs text-black/50">No division-specific entry in the Canva 2026 palette.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {canvaMatch.map((c) => (
              <div key={c.hex + c.division} className="overflow-hidden rounded-xl border border-black/10 bg-white">
                <div className="h-14 w-full" style={{ background: c.hex }} />
                <div className="p-2.5 text-[10px] text-black/60">
                  <div className="text-xs font-medium text-black">{c.division}</div>
                  <div className="mt-1 font-mono uppercase">{c.hex}</div>
                  <div>RGB {c.rgb}</div>
                  <div>CMYK {c.cmyk}</div>
                  <div>Pantone {c.pantone}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function TypeRow({ s }: { s: TypeStyle }) {
  return (
    <li className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="font-medium text-black">{s.label}</span>
      <span className="text-right text-xs text-black/60">
        {s.sizePx}px · {s.weight}
        {s.leading && ` · ${s.leading}`}
        {s.tracking && ` · ${s.tracking}`}
      </span>
    </li>
  );
}

function TypeTab({ guide }: { guide: BrandGuide }) {
  return (
    <div className="space-y-4">
      <Section title="Typefaces">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-black/[0.06] bg-white p-4">
            <div className="text-[10px] uppercase tracking-widest text-black/50">Primary</div>
            <div className="mt-1 text-lg font-medium text-black">{guide.typefacePrimary}</div>
          </div>
          <div className="rounded-lg border border-black/[0.06] bg-white p-4">
            <div className="text-[10px] uppercase tracking-widest text-black/50">Web</div>
            <div className="mt-1 text-lg font-medium text-black">{guide.typefaceWeb}</div>
          </div>
        </div>
      </Section>
      <Section title="Heading scale">
        <ul className="divide-y divide-black/[0.06]">{guide.headingScale.map((s, i) => <TypeRow key={s.label + i} s={s} />)}</ul>
      </Section>
      <Section title="Body scale">
        <ul className="divide-y divide-black/[0.06]">{guide.bodyScale.map((s, i) => <TypeRow key={s.label + i} s={s} />)}</ul>
      </Section>
    </div>
  );
}

function LogoTab({ guide }: { guide: BrandGuide }) {
  return (
    <div className="space-y-4">
      {guide.logoNotes && (
        <Section title={guide.logoNotes.headline}>
          <p className="text-sm leading-relaxed text-black/70">{guide.logoNotes.body}</p>
        </Section>
      )}
      <Section title={`Rules (${guide.logoRules.length})`}>
        <ul className="space-y-3">
          {guide.logoRules.map((r: LogoRule, i) => (
            <li key={r.title + i} className="rounded-lg border border-black/[0.06] bg-white p-3">
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium uppercase tracking-widest ${
                  r.do === false ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                }`}>{r.do === false ? "don't" : "do"}</span>
                <span className="text-sm font-medium text-black">{r.title}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-black/60">{r.description}</p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function SubBrandsTab({ guide }: { guide: BrandGuide }) {
  if (!guide.subBrands || guide.subBrands.length === 0) {
    return <Section title="Sub-brands"><div className="text-xs text-black/50">This guide has no sub-brand groups.</div></Section>;
  }
  return (
    <div className="space-y-4">
      {guide.subBrands.map((grp) => (
        <Section key={grp.group} title={grp.group}>
          <div className="flex flex-wrap gap-2">
            {grp.items.map((it) => (
              <span key={it} className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70">{it}</span>
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}

function IntelTab({ slug }: { slug: string }) {
  const intel = getBrandhubIntel(slug);
  if (!intel) {
    return (
      <Section title="BrandHub intelligence">
        <div className="text-xs text-black/50">
          No BrandHub intelligence record is available for this guide yet.
        </div>
      </Section>
    );
  }
  const audience = targetAudienceText(intel.targetAudience);
  const tone = normalizeVoiceValue(intel.voiceProfile?.tone);
  const style = normalizeVoiceValue(intel.voiceProfile?.style);
  return (
    <div className="space-y-4">
      <Section title="Summary"><p className="text-sm leading-relaxed text-black/75">{intel.summary}</p></Section>
      <Section title="Market position"><p className="text-sm leading-relaxed text-black/75">{intel.marketPosition}</p></Section>
      {audience && <Section title="Target audience"><p className="text-sm leading-relaxed text-black/75">{audience}</p></Section>}
      {(tone.length > 0 || style.length > 0) && (
        <Section title="Voice profile">
          <div className="flex flex-wrap gap-2">
            {tone.map((v) => <span key={"t" + v} className="rounded-full bg-[#003FC7]/10 px-3 py-1 text-xs text-[#003FC7]">{v}</span>)}
            {style.map((v) => <span key={"s" + v} className="rounded-full bg-[#C2A3FF]/20 px-3 py-1 text-xs text-black/80">{v}</span>)}
          </div>
        </Section>
      )}
      {intel.competitiveAdvantages && intel.competitiveAdvantages.length > 0 && (
        <Section title="Competitive advantages">
          <ul className="space-y-1.5 text-sm text-black/75">
            {intel.competitiveAdvantages.map((c, i) => <li key={i}>· {c}</li>)}
          </ul>
        </Section>
      )}
      {intel.growthRecommendations && intel.growthRecommendations.length > 0 && (
        <Section title="Growth recommendations">
          <ul className="space-y-2">
            {intel.growthRecommendations.slice(0, 6).map((g, i) => (
              <li key={i} className="rounded-lg border border-black/[0.06] bg-white p-3">
                <div className="text-sm font-medium text-black">{g.recommendation}</div>
                {g.rationale && <div className="mt-1 text-xs text-black/60">{g.rationale}</div>}
                {g.priority && <div className="mt-1 text-[10px] uppercase tracking-widest text-black/40">Priority: {g.priority}</div>}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {intel.competitiveLandscape?.competitors && intel.competitiveLandscape.competitors.length > 0 && (
        <Section title="Competitors">
          <div className="flex flex-wrap gap-2">
            {intel.competitiveLandscape.competitors.map((c) => (
              <span key={c} className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70">{c}</span>
            ))}
          </div>
        </Section>
      )}
      {intel.culturalInsights?.primary_markets && intel.culturalInsights.primary_markets.length > 0 && (
        <Section title="Primary markets">
          <div className="flex flex-wrap gap-2">
            {intel.culturalInsights.primary_markets.map((m) => (
              <span key={m} className="rounded-full bg-[#A1FBF9]/20 px-3 py-1 text-xs text-black/80">{m}</span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function SourcesTab({ slug }: { slug: string }) {
  const listFn = useServerFn(listPdfExtractionsForDivision);
  const getText = useServerFn(getPdfExtractionText);
  const [openId, setOpenId] = useState<string | null>(null);

  const rowsQ = useQuery({
    queryKey: ["admin-knowledge-sources", slug],
    queryFn: () => listFn({ data: { divisionOrSlug: slug } }),
  });
  const textQ = useQuery({
    queryKey: ["admin-knowledge-source-text", openId],
    queryFn: () => (openId ? getText({ data: { id: openId } }) : Promise.resolve(null)),
    enabled: !!openId,
  });

  const rows = rowsQ.data ?? [];
  const totals = useMemo(() => {
    return {
      ok: rows.filter((r) => r.status === "ok").length,
      embedded: rows.filter((r) => (r.chunk_count ?? 0) > 0).length,
      chunks: rows.reduce((n, r) => n + (r.chunk_count ?? 0), 0),
      chars: rows.reduce((n, r) => n + (r.char_count ?? 0), 0),
    };
  }, [rows]);

  if (rowsQ.isLoading) {
    return <Section title="Source documents"><div className="text-xs text-black/50">Loading…</div></Section>;
  }
  if (rows.length === 0) {
    return (
      <Section title="Source documents">
        <div className="text-xs text-black/50">
          No source PDFs are ingested for this division yet. Run ingestion at{" "}
          <Link to="/admin/pdf-ingest" className="underline">Admin → PDF Ingestion</Link>.
        </div>
      </Section>
    );
  }

  return (
    <>
      <Section title={`Source documents (${rows.length})`}>
        <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-black/60">
          <span>OK: <b className="text-emerald-700">{totals.ok}</b></span>
          <span>Embedded: <b className="text-[#003FC7]">{totals.embedded}/{totals.ok}</b></span>
          <span>{totals.chunks.toLocaleString()} chunks</span>
          <span>{totals.chars.toLocaleString()} chars</span>
        </div>
        <ul className="divide-y divide-black/[0.06]">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <div className="truncate text-black">{r.title}</div>
                <a
                  href={r.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 block truncate text-[10px] text-black/40 hover:text-[#003FC7]"
                >
                  {r.source_url}
                </a>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-black/50">{r.char_count.toLocaleString()} ch</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${
                  (r.chunk_count ?? 0) > 0
                    ? "bg-[#003FC7]/10 text-[#003FC7]"
                    : r.status === "ok"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-black/[0.06] text-black/50"
                }`}
              >
                {(r.chunk_count ?? 0) > 0 ? `${r.chunk_count} ch` : r.status === "ok" ? "not embedded" : r.status}
              </span>
              {r.status === "ok" && (
                <button
                  type="button"
                  onClick={() => setOpenId(r.id)}
                  className="shrink-0 rounded-full border border-black/15 px-2 py-0.5 text-[10px] text-black/70 hover:border-black/40"
                >
                  View text
                </button>
              )}
            </li>
          ))}
        </ul>
      </Section>
      {openId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={() => setOpenId(null)}>
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{textQ.data?.title ?? "…"}</div>
                <div className="truncate text-[10px] text-black/50">{textQ.data?.source_url}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="rounded-full border border-black/15 px-3 py-1 text-xs text-black/70"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {textQ.isLoading ? (
                <div className="text-sm text-black/50">Loading…</div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-black/80">
                  {textQ.data?.extracted_text ?? "(no text)"}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


function VoiceoverTab({ index }: { index: VoiceoverIndex[] }) {
  if (index.length === 0) {
    return <Section title="Voiceover topics"><div className="text-xs text-black/50">Loading topic index…</div></Section>;
  }
  return (
    <Section title={`Voiceover topics (${index.length})`}>
      <p className="mb-3 text-xs text-black/50">
        Narration beat index across the knowledgebase VTT set. Voiceover is display-only — no STT/TTS wiring per project constraints.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {index.map((v) => (
          <li key={v.slug} className="rounded-lg border border-black/[0.06] bg-white p-3">
            <div className="flex items-baseline justify-between">
              <div className="text-sm font-medium text-black capitalize">{v.slug.replace(/-/g, " ")}</div>
              <div className="text-[10px] text-black/40">{v.duration ? `${Math.round(v.duration)}s` : ""}</div>
            </div>
            {v.beats.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {v.beats.slice(0, 3).map((b, i) => (
                  <li key={i} className="text-xs text-black/60">
                    <span className="mr-1.5 font-mono text-[10px] text-black/40">{Math.round(b.start)}s</span>
                    {b.label}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-[10px] text-black/40">No beats recorded.</div>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ImportedDecksTab({ slug }: { slug: string }) {
  const listFn = useServerFn(listImportedDecksForDivision);
  const uploadFn = useServerFn(uploadImportedDeck);
  const getSlidesFn = useServerFn(getImportedDeckSlides);
  const deleteFn = useServerFn(deleteImportedDeck);
  const embedFn = useServerFn(embedImportedDecks);
  const sendFn = useServerFn(sendImportedSlideToLibrary);
  const [embedding, setEmbedding] = useState<string | null>(null);
  const [embedMsg, setEmbedMsg] = useState<string | null>(null);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const rowsQ = useQuery({
    queryKey: ["admin-knowledge-imported", slug, refreshKey],
    queryFn: () => listFn({ data: { divisionId: slug } }),
  });

  // Lightweight metadata (filename + signed download url + status + outline)
  const detailQ = useQuery({
    queryKey: ["admin-knowledge-imported-detail", openId],
    queryFn: () => (openId ? getSlidesFn({ data: { id: openId } }) : Promise.resolve(null)),
    enabled: !!openId,
  });


  async function handleFile(file: File) {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".pptx")) {
      setError("Only .pptx files are supported.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("File exceeds 100MB.");
      return;
    }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
      }
      const b64 = btoa(bin);
      await uploadFn({ data: { divisionId: slug, filename: file.name, data: b64 } });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this imported deck?")) return;
    try {
      await deleteFn({ data: { id } });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  const rows = rowsQ.data ?? [];
  const detail = detailQ.data;

  return (
    <>
      <Section title="Upload PowerPoint">
        <p className="mb-3 text-xs text-black/60">
          Upload a .pptx to store it against <span className="font-medium">{slug}</span>. We extract slide text, notes, and theme colors — pixel-perfect visual thumbnails are a later layer.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#003FC7] bg-[#003FC7] px-4 py-2 text-xs font-medium text-white hover:opacity-90">
          {uploading ? "Uploading…" : "Choose .pptx"}
          <input
            type="file"
            accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.currentTarget.value = "";
            }}
            className="hidden"
          />
        </label>
        {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      </Section>

      <Section title={`Imported decks (${rows.length})`}>
        {rowsQ.isLoading ? (
          <div className="text-xs text-black/50">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-black/50">No decks imported for this division yet.</div>
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-black">{r.original_filename}</div>
                  <div className="mt-0.5 text-[10px] text-black/40">
                    {new Date(r.created_at).toLocaleString()} · {(r.file_size / 1024).toFixed(0)} KB
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-black/[0.06] px-2 py-0.5 font-mono text-[10px] text-black/60">
                  {r.slide_count} slides
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    r.chunk_count > 0
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-black/[0.06] text-black/50"
                  }`}
                  title={r.embedded_at ? `Embedded ${new Date(r.embedded_at).toLocaleString()}` : "Not embedded into RAG"}
                >
                  {r.chunk_count > 0 ? `${r.chunk_count} chunks` : "not embedded"}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${
                    r.status === "parsed"
                      ? "bg-[#003FC7]/10 text-[#003FC7]"
                      : r.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {r.status}
                </span>
                <button
                  type="button"
                  onClick={() => setOpenId(r.id)}
                  className="shrink-0 rounded-full border border-black/15 px-2 py-0.5 text-[10px] text-black/70 hover:border-black/40"
                >
                  View
                </button>
                <button
                  type="button"
                  disabled={embedding === r.id || r.status !== "parsed"}
                  onClick={async () => {
                    setEmbedding(r.id);
                    setEmbedMsg(null);
                    try {
                      const res = await embedFn({ data: { id: r.id, skipEmbedded: false } });
                      const first = res.results[0];
                      setEmbedMsg(
                        first?.status === "ok"
                          ? `Embedded "${first.filename}" → ${first.chunks} chunks`
                          : `Embed ${first?.status ?? "done"}: ${first?.error ?? ""}`,
                      );
                      setRefreshKey((k) => k + 1);
                    } catch (e) {
                      setEmbedMsg(`Embed failed: ${e instanceof Error ? e.message : "unknown"}`);
                    } finally {
                      setEmbedding(null);
                    }
                  }}
                  className="shrink-0 rounded-full border border-emerald-300 px-2 py-0.5 text-[10px] text-emerald-800 hover:border-emerald-600 disabled:opacity-50"
                >
                  {embedding === r.id ? "Embedding…" : r.chunk_count > 0 ? "Re-embed" : "Embed → RAG"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="shrink-0 rounded-full border border-red-200 px-2 py-0.5 text-[10px] text-red-700 hover:border-red-500"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
        {embedMsg && (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{embedMsg}</div>
        )}
        {sendMsg && (
          <div className="mt-3 rounded-lg bg-[#003FC7]/10 px-3 py-2 text-xs text-[#003FC7]">{sendMsg}</div>
        )}
      </Section>

      <LibrarySubmissionsSection slug={slug} />




      {openId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={() => setOpenId(null)}>
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-black">
                  {detail?.original_filename ?? "Loading…"}
                </div>
                {detail && (
                  <div className="text-[10px] text-black/50">
                    {detail.slide_count} slides
                    {detail.theme?.accent1 && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: detail.theme.accent1 }} />
                        {detail.theme.accent1}
                      </span>
                    )}
                    {detail.theme?.headingFont && <span className="ml-2">· {detail.theme.headingFont}</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {detail?.downloadUrl && (
                  <a
                    href={detail.downloadUrl}
                    className="rounded-full border border-black/15 px-3 py-1 text-[11px] text-black/70 hover:border-black/40"
                  >
                    Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  className="rounded-full border border-black/15 px-3 py-1 text-[11px] text-black/70 hover:border-black/40"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[76vh] overflow-y-auto bg-black/[0.02] px-4 py-4">
              {detailQ.isLoading || !detail ? (
                <div className="text-xs text-black/50">Loading…</div>
              ) : (
                <ol className="space-y-4">
                  {(detail.slides ?? []).map((sl) => {
                    const key = `${openId}:${sl.index}`;
                    return (
                    <li key={sl.index} className="rounded-xl border border-black/10 bg-white p-3">
                      <div className="mb-1 flex items-baseline gap-2">
                        <span className="font-mono text-[10px] text-black/40">#{sl.index + 1}</span>
                        <span className="text-sm font-medium text-black">{sl.title}</span>
                        {sl.imageCount > 0 && (
                          <span className="text-[10px] text-black/40">
                            · {sl.imageCount} image{sl.imageCount === 1 ? "" : "s"}
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={sendingKey === key}
                          onClick={async () => {
                            if (!openId) return;
                            setSendingKey(key);
                            setSendMsg(null);
                            try {
                              await sendFn({ data: { importedDeckId: openId, slideIndex: sl.index } });
                              setSendMsg(`Sent slide ${sl.index + 1} to the ${slug} library.`);
                            } catch (e) {
                              setSendMsg(`Send failed: ${e instanceof Error ? e.message : "unknown"}`);
                            } finally {
                              setSendingKey(null);
                            }
                          }}
                          className="ml-auto shrink-0 rounded-full border border-[#003FC7]/40 px-2 py-0.5 text-[10px] text-[#003FC7] hover:border-[#003FC7] disabled:opacity-50"
                        >
                          {sendingKey === key ? "Sending…" : "Send to library"}
                        </button>
                      </div>
                      {sl.bullets.length > 0 && (
                        <ul className="ml-4 list-disc space-y-0.5 text-xs text-black/70">
                          {sl.bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}
                      {sl.notes && (
                        <div className="mt-2 rounded-lg bg-black/[0.03] p-2 text-[11px] italic text-black/60">
                          Notes: {sl.notes}
                        </div>
                      )}
                    </li>
                    );
                  })}
                </ol>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}

function LibrarySubmissionsSection({ slug }: { slug: string }) {
  const listFn = useServerFn(listLibrarySlideExamples);
  const deleteFn = useServerFn(deleteLibrarySlideExample);
  const [refreshKey, setRefreshKey] = useState(0);
  const q = useQuery({
    queryKey: ["library-slide-examples", slug, refreshKey],
    queryFn: () => listFn({ data: { divisionId: slug } }),
  });
  const rows = (q.data ?? []) as LibrarySlideExample[];

  async function handleDelete(id: string) {
    if (!confirm("Remove this submission from the library?")) return;
    try {
      await deleteFn({ data: { id } });
      setRefreshKey((k) => k + 1);
    } catch {
      /* ignore */
    }
  }

  return (
    <Section title={`Library submissions (${rows.length})`}>
      <p className="mb-3 text-xs text-black/60">
        Slides teammates have sent to the <span className="font-medium">{slug}</span> approved-variants library. Each one keeps its extracted imagery so it stays visually intact.
      </p>
      {q.isLoading ? (
        <div className="text-xs text-black/50">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-black/50">No slides sent yet. Use “Send to library” on any slide in an imported deck above.</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-black/10 bg-white p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-black">{r.title || `Slide ${r.slide_index + 1}`}</div>
                  <div className="mt-0.5 text-[10px] text-black/40">
                    #{r.slide_index + 1} · {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="shrink-0 rounded-full border border-red-200 px-2 py-0.5 text-[10px] text-red-700 hover:border-red-500"
                >
                  Remove
                </button>
              </div>
              {r.imageUrls.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {r.imageUrls.slice(0, 6).map((u, i) => (
                    <img
                      key={i}
                      src={u}
                      alt=""
                      className="aspect-[4/3] w-full rounded-md object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
              {r.bullets.length > 0 && (
                <ul className="mt-2 ml-4 list-disc space-y-0.5 text-xs text-black/70">
                  {r.bullets.slice(0, 5).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}



// ─────────────────────────────────────────────────────────────────────────
// Division Imagery Tab — upload, tag, and manage per-division photography /
// abstract backdrops. Entries live in the private `division-imagery` bucket
// and are visible to every signed-in teammate as shared brand knowledge.
// ─────────────────────────────────────────────────────────────────────────
function DivisionImageryTab({ guide }: { guide: BrandGuide }) {
  const divisionId = guide.divisionId;
  const listFn = useServerFn(listDivisionImagery);
  const uploadFn = useServerFn(uploadDivisionImagery);
  const updateFn = useServerFn(updateDivisionImagery);
  const deleteFn = useServerFn(deleteDivisionImagery);
  const fileRef = useRef<HTMLInputElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"photo" | "abstract" | "upload">("photo");
  const [tagsDraft, setTagsDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [editing, setEditing] = useState<DivisionImageryEntry | null>(null);
  const [editTags, setEditTags] = useState("");
  const [editNote, setEditNote] = useState("");

  const q = useQuery({
    queryKey: ["division-imagery", divisionId, refreshKey],
    queryFn: () => listFn({ data: { divisionId } }),
    retry: false,
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const tags = tagsDraft
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) {
          setError(`${f.name}: not an image.`);
          continue;
        }
        if (f.size > 20 * 1024 * 1024) {
          setError(`${f.name}: exceeds 20MB.`);
          continue;
        }
        const b64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => reject(r.error);
          r.readAsDataURL(f);
        });
        await uploadFn({
          data: {
            divisionId,
            filename: f.name,
            contentType: f.type || "application/octet-stream",
            data: b64,
            kind: kind === "upload" ? "upload" : kind,
            tags,
            note: noteDraft || undefined,
          },
        });
      }
      setTagsDraft("");
      setNoteDraft("");
      if (fileRef.current) fileRef.current.value = "";
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this image from the division library?")) return;
    try {
      await deleteFn({ data: { id } });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  function openEditor(e: DivisionImageryEntry) {
    setEditing(e);
    setEditTags(e.tags.join(", "));
    setEditNote(e.note ?? "");
  }

  async function saveEditor() {
    if (!editing) return;
    try {
      await updateFn({
        data: {
          id: editing.id,
          tags: editTags
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean),
          note: editNote || null,
        },
      });
      setEditing(null);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  }

  const rows = q.data ?? [];

  // Curated built-in imagery for this division (bundled in the app build).
  // Master TransPerfect maps to the enterprise (corporate-dark) pool.
  const builtInKey = divisionId === "master" ? "bm-enterprise" : divisionId;
  const builtInSet = DIVISION_IMAGERY[builtInKey];
  const builtIn = builtInSet
    ? [
        ...builtInSet.photos.map((src, i) => ({ src, kind: "photo" as const, name: `built-in / photo-${String(i + 1).padStart(2, "0")}` })),
        ...builtInSet.abstracts.map((src, i) => ({ src, kind: "abstract" as const, name: `built-in / abstract-${String(i + 1).padStart(2, "0")}` })),
      ]
    : [];

  return (
    <>
      <Section title="Upload division imagery">
        <p className="mb-3 text-xs text-black/60">
          Add photography, abstracts, or references for <span className="font-medium">{guide.title}</span>.
          Everything you upload becomes part of the shared imagery pool for this division and is available
          across the app (imagery repository, slide backgrounds, AI matching).
        </p>
        <div className="grid gap-3 md:grid-cols-[auto_1fr_1fr]">
          <div className="inline-flex overflow-hidden rounded-full border border-black/15 text-[11px]">
            {(["photo", "abstract", "upload"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`px-3 py-1.5 ${kind === k ? "bg-[#05041A] text-white" : "text-black/70 hover:bg-black/5"}`}
              >
                {k}
              </button>
            ))}
          </div>
          <input
            value={tagsDraft}
            onChange={(e) => setTagsDraft(e.target.value)}
            placeholder="Tags (comma separated)"
            className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs outline-none focus:border-black/40"
          />
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Note / context (optional)"
            className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs outline-none focus:border-black/40"
          />
        </div>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#003FC7] bg-[#003FC7] px-4 py-2 text-xs font-medium text-white hover:opacity-90">
          {busy ? "Uploading…" : "Choose images"}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </label>
        {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      </Section>

      {builtIn.length > 0 && (
        <Section title={`Built-in imagery (${builtIn.length})`}>
          <p className="mb-3 text-xs text-black/60">
            Curated backdrops bundled with the app for <span className="font-medium">{guide.title}</span>.
            Used automatically as slide backgrounds and available across the module library. Uploads below
            extend this pool.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {builtIn.map((b) => (
              <div key={b.src} className="overflow-hidden rounded-xl border border-black/10 bg-white">
                <div className="relative aspect-[4/3] w-full bg-black/[0.04]">
                  <img src={b.src} alt={b.name} className="h-full w-full object-cover" loading="lazy" />
                  <span className="absolute left-2 top-2 rounded-full bg-[#003FC7] px-2 py-0.5 text-[9px] uppercase tracking-widest text-white">
                    Built-in
                  </span>
                  <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[9px] uppercase tracking-widest text-white">
                    {b.kind}
                  </span>
                </div>
                <div className="p-2.5">
                  <div className="truncate text-xs font-medium text-black" title={b.name}>{b.name}</div>
                  <div className="mt-0.5 text-[10px] text-black/40">Bundled asset · always available</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={`Division imagery (${rows.length})`}>
        {q.isLoading ? (
          <div className="text-xs text-black/50">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-black/50">No imagery uploaded for this division yet.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {rows.map((r) => (
              <div key={r.id} className="group overflow-hidden rounded-xl border border-black/10 bg-white">
                <div className="relative aspect-[4/3] w-full bg-black/[0.04]">
                  {r.signedUrl ? (
                    <img
                      src={r.signedUrl}
                      alt={r.filename}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-black/40">
                      preview unavailable
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[9px] uppercase tracking-widest text-white">
                    {r.kind}
                  </span>
                </div>
                <div className="p-2.5">
                  <div className="truncate text-xs font-medium text-black" title={r.filename}>
                    {r.filename}
                  </div>
                  <div className="mt-0.5 text-[10px] text-black/40">
                    {(r.size_bytes / 1024).toFixed(0)} KB · {new Date(r.created_at).toLocaleDateString()}
                  </div>
                  {r.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {r.tags.slice(0, 5).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[9px] text-black/60"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.note && (
                    <div className="mt-1.5 line-clamp-2 text-[10px] italic text-black/50">{r.note}</div>
                  )}
                  <div className="mt-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEditor(r)}
                      className="flex-1 rounded-full border border-black/15 px-2 py-0.5 text-[10px] text-black/70 hover:border-black/40"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="rounded-full border border-red-200 px-2 py-0.5 text-[10px] text-red-700 hover:border-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-black">{editing.filename}</div>
                <div className="text-[10px] text-black/40">Update memory (tags + note)</div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-full border border-black/15 px-3 py-1 text-[11px] text-black/70 hover:border-black/40"
              >
                Close
              </button>
            </div>
            {editing.signedUrl && (
              <img src={editing.signedUrl} alt={editing.filename} className="max-h-64 w-full object-contain bg-black/[0.03]" />
            )}
            <div className="space-y-3 p-4">
              <label className="block">
                <div className="mb-1 text-[10px] uppercase tracking-widest text-black/50">Tags (comma separated)</div>
                <input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs outline-none focus:border-black/40"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-[10px] uppercase tracking-widest text-black/50">Note</div>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs outline-none focus:border-black/40"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-full border border-black/15 px-3 py-1.5 text-xs text-black/70 hover:border-black/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditor}
                  className="rounded-full border border-[#003FC7] bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
