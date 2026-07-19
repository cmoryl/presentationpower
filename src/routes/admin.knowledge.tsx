import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BRAND_GUIDES, type BrandGuide, type ColorSwatch, type TypeStyle, type LogoRule } from "@/lib/brand-guides";
import { getBrandhubIntel, targetAudienceText, normalizeVoiceValue } from "@/lib/brandhub-intel";

export const Route = createFileRoute("/admin/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Browser · Admin · TransPerfect" },
      { name: "description", content: "Browse per-division brand guides, colors, typography, logo rules, BrandHub intel, and voiceover topics." },
    ],
  }),
  component: AdminKnowledgeBrowser,
});

type Tab = "overview" | "colors" | "type" | "logo" | "subbrands" | "intel" | "voiceover";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "colors", label: "Colors" },
  { id: "type", label: "Typography" },
  { id: "logo", label: "Logo rules" },
  { id: "subbrands", label: "Sub-brands" },
  { id: "intel", label: "BrandHub intel" },
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
                g.slug === slug ? "bg-[#03002C] text-white" : "text-black/80 hover:bg-black/[0.04]"
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
                tab === t.id ? "bg-[#03002C] text-white" : "text-black/70 hover:bg-black/5"
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
          No BrandHub intelligence record was distilled for this division. Intel currently covers 10 divisions: TransPerfect master, Life Sciences, Legal, Gaming, Media, Digital, GlobalLink, DataForce, Cobrand, and Trial Interactive. The remaining divisions have no source material in the BrandHub export — awaiting user-supplied intel.
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
