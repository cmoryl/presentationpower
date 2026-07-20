import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  BRAND_MODES,
  MODULE_VARIANTS,
  MODULE_FAMILIES,
  SECTION_FRAMEWORKS,
  LAYOUT_FRAMEWORKS,
} from "@/lib/taxonomy";
import { ICON_LIBRARY } from "@/lib/icon-library";
import { BRAND_GUIDES } from "@/lib/brand-guides";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About · TransPerfect Modular" },
      {
        name: "description",
        content:
          "How TransPerfect Modular works — the systems behind briefs, decks, brand governance, and the AI assistants that run underneath.",
      },
      { property: "og:title", content: "About · TransPerfect Modular" },
      {
        property: "og:description",
        content:
          "A living overview of the platform: modules, brand governance, imports, exports, and the AI layer.",
      },
    ],
  }),
  component: AboutPage,
});

type Stat = { value: string | number; label: string };
type Pillar = {
  kicker: string;
  title: string;
  body: string;
  bullets: string[];
  to?: string;
  toLabel?: string;
};

const CHANGELOG: Array<{ date: string; title: string; body: string }> = [
  {
    date: "2026-07",
    title: "GlobalLink admin + translation engine",
    body: "New /admin/globallink dashboard for API base URL, key, project code and callback secret. Powers the AI/GlobalLink translation overlay engine used by TranslateDrawer, LanguageSwitcher and localized PPTX/PDF exports.",
  },
  {
    date: "2026-07",
    title: "Multi-language decks & slide overlays",
    body: "Non-destructive translation overlays per slide with per-slide language status badges, job history, retries, and localized exports.",
  },
  {
    date: "2026-07",
    title: "Division-specific imagery library",
    body: "New division-imagery bucket managed from /admin/knowledge → Imagery, surfaced as a searchable Team library inside SlideImageryPanel and BackgroundImageryPanel.",
  },
  {
    date: "2026-07",
    title: "Per-division PPTX import + RAG",
    body: "Upload .pptx per division into imported_decks, view outlines, and chunk/embed them into the same gemini-embedding-001 (3072-dim) index the PDF extractions use.",
  },
  {
    date: "2026-07",
    title: "Batch PDF ingestion + embeddings",
    body: "170 pdf_extractions processed with Gemini, 1,035 chunks embedded across all 10 divisions. Sources surface per-division in /admin/knowledge.",
  },
  {
    date: "2026-07",
    title: "Deck collaboration & review workflow",
    body: "deck_comments table with CommentsPanel and ReviewStatusControl. Version snapshots and autosave validated at the RLS layer.",
  },
  {
    date: "2026-07",
    title: "Shareable deck links + analytics",
    body: "View-only /share/$token viewer with expiry, revocation and token regeneration. /analytics dashboard tracks views per link.",
  },
  {
    date: "2026-07",
    title: "Deck duplication, templates & presenter view",
    body: "Duplicate any deck, flag as team template, browse /templates gallery, and run Presenter view with speaker notes.",
  },
  {
    date: "2026-07",
    title: "Deck-level rebranding with live preview",
    body: "Rebrand action re-tones the entire deck to any brand mode with auto-snapshot for safe rollback.",
  },
  {
    date: "2026-07",
    title: "Editor ergonomics bundle",
    body: "Session Undo/Redo, SwapLayoutPicker, debounced autosave, slide reorder/duplicate, and modal-wide focus trapping via use-modal-a11y.",
  },
  {
    date: "2026-07",
    title: "Backgrounds & imagery system",
    body: "Per-slide solids, gradients, patterns and image positioning. Expanded uploads to GIF, AVIF and SVG with vector-preserving passthrough.",
  },
  {
    date: "2026-07",
    title: "Export preflight + custom image fidelity",
    body: "ExportPreflightModal scans CORS and asset risks before PPTX/PDF/Present. pptx-export renders custom mediaUrls with SVG rasterization on the fly.",
  },
  {
    date: "2026-07",
    title: "Conversational deck Copilot",
    body: "Glass drawer in the deck editor executes natural-language instructions via Claude tool-use — add, edit, reorder, swap variants, rewrite copy.",
  },
  {
    date: "2026-07",
    title: "Narrative Strategist + Deep RAG synthesis",
    body: "Brief flow gets a deck-architecture pass, and Claude reasons over full documents with hybrid retrieval across the embedded corpus.",
  },
  {
    date: "2026-07",
    title: "Semantic icon + logo suggestions & Oracle chat",
    body: "Embedding-driven asset picks, plus a conversational Oracle knowledge chat.",
  },
  {
    date: "2026-07",
    title: "Brand Reviewer agent",
    body: "Claude scores decks against the owned brand guides. All ~405 logos and 111k icons migrated locally — no BrandHub runtime dependency.",
  },
  {
    date: "2026-07",
    title: "LogoHub + client co-branding",
    body: "client_logos storage with a logo picker inside the deck editor and SlideChrome. Managed at /admin/logohub.",
  },
  {
    date: "2026-07",
    title: "High-end variant design pass",
    body: "28 new editorial layouts including Bento and Dashboard families with native PPTX chart mappings and cinematic hero scrims.",
  },
  {
    date: "2026-07",
    title: "Library search, filtering & A/B audit",
    body: "Multi-select filters, virtualization, and WCAG 2.1 audit with automated Playwright visual regression across light/dark A/B variants.",
  },
  {
    date: "2026-07",
    title: "Home & Admin Command Centers",
    body: "Signed-in home and /admin upgraded with KPI sparklines, recent activity and quick actions.",
  },
  {
    date: "2026-07",
    title: "Icon Studio + curated Lucide picker",
    body: "/admin/icon-studio for iconography tokens; per-item icon picker in the deck editor overrides label-based auto-match.",
  },
  {
    date: "2026-07",
    title: "10 divisions, fully owned",
    body: "Scope corrected to 10 canonical divisions with locally-hosted logos, brand intel and embedded source docs.",
  },
];

function AboutPage() {
  const stats: Stat[] = [
    { value: MODULE_VARIANTS.length, label: "Module variants" },
    { value: MODULE_FAMILIES.length, label: "Module families" },
    { value: SECTION_FRAMEWORKS.length, label: "Section frameworks" },
    { value: LAYOUT_FRAMEWORKS.length, label: "Layout frameworks" },
    { value: BRAND_MODES.length, label: "Brand modes" },
    { value: BRAND_GUIDES.length, label: "Brand guides" },
    { value: ICON_LIBRARY.length, label: "Icons in library" },
    { value: CHANGELOG.length, label: "Recent releases" },
  ];

  const pillars: Pillar[] = [
    {
      kicker: "01 · Intake",
      title: "Structured briefs, not blank docs.",
      body:
        "Every deck starts from a brief that captures prospect, industry, meeting objective, audience, brand mode, and narrative archetype. The brief drives module selection downstream — nothing is chosen at random.",
      bullets: [
        "Prospect, industry & audience fields",
        "Brand mode + narrative archetype",
        "Client facts feed the AI reviewer",
      ],
      to: "/brief/new",
      toLabel: "Start a brief →",
    },
    {
      kicker: "02 · Assemble",
      title: "Modular decks from a governed library.",
      body:
        "Assemble picks module variants across section frameworks — Opening, Context, Solution, Process, Proof, Decision, Close — and each variant declares which layouts, tokens, and icons it permits.",
      bullets: [
        `${MODULE_VARIANTS.length} variants across ${SECTION_FRAMEWORKS.length} sections`,
        "Layout & token constraints enforced at render",
        "Swap variants without losing content",
      ],
      to: "/atlas",
      toLabel: "Browse the atlas →",
    },
    {
      kicker: "03 · Personalize",
      title: "Edit copy inline, keep the brand locked.",
      body:
        "The deck editor exposes only the fields a module allows. Locked chrome — logos, footers, section markers — stays consistent, while narrative fields, stats, and icons remain fully editable.",
      bullets: [
        "Per-item icon picker (auto or curated Lucide)",
        "Editable field paths declared per variant",
        "AI change log with per-field revert",
      ],
    },
    {
      kicker: "04 · Import",
      title: "Reformat existing PowerPoints.",
      body:
        "Drop a .pptx. We extract titles, bullets and notes, map each slide to the closest module variant, and let you override before assembly. Original layout & fonts are discarded — content only.",
      bullets: [
        "Heuristic slide → variant mapping",
        "Row-level override before creation",
        "25MB limit, .pptx only",
      ],
      to: "/decks/import",
      toLabel: "Import a deck →",
    },
    {
      kicker: "05 · Export & present",
      title: "Ship to PowerPoint or present live.",
      body:
        "Export renders each slide to a governed pptx using brand tokens. Present mode runs the deck fullscreen with keyboard navigation and speaker context.",
      bullets: [
        "Client-side pptxgenjs export",
        "Fullscreen present with arrow keys",
        "Per-deck export history",
      ],
    },
    {
      kicker: "06 · Knowledge & brand",
      title: "One source of truth for the brand.",
      body:
        "Knowledge holds the Oracle KB, case studies, glossary and long-form guides. Brand Guides mirror the TransPerfect BrandHub — logo, color, type, iconography, layout and voice.",
      bullets: [
        "Oracle KB → Knowledge sync",
        "Master TransPerfect guide (26.06 / 3.0)",
        "Sub-brand & division rules",
      ],
      to: "/knowledge",
      toLabel: "Open knowledge →",
    },
    {
      kicker: "07 · Governance",
      title: "Admin controls, audit, and QA.",
      body:
        "Admins manage users, approvals, A/B experiments, imagery library, Oracle KB, and the Icon Studio. Every high-impact action is logged and the QA panel surfaces blocking issues per slide.",
      bullets: [
        "User roles stored in user_roles (RLS-safe)",
        "Blocking vs warning QA gates",
        "Icon Studio for iconography tokens",
      ],
      to: "/admin",
      toLabel: "Open admin →",
    },
    {
      kicker: "08 · AI layer",
      title: "Suggest, review, and rewrite in-place.",
      body:
        "The deck chat drafts copy, tightens tone, and rewrites individual fields against the brief. Every AI change is recorded and can be reverted per field from the editor.",
      bullets: [
        "Runs on the Lovable AI gateway",
        "Per-field change log with revert",
        "Grounded on brief + knowledge",
      ],
    },
    {
      kicker: "09 · Collaboration",
      title: "Comments, reviews, versions.",
      body:
        "Reviewers leave threaded comments on any slide, move decks through review states, and roll back to any snapshot. Autosave and version history are enforced at the RLS layer.",
      bullets: [
        "deck_comments with CommentsPanel",
        "ReviewStatusControl transitions",
        "Non-destructive version restore",
      ],
    },
    {
      kicker: "10 · Share & analyze",
      title: "View-only links with analytics.",
      body:
        "Generate a share token with expiry, revoke or regenerate anytime, and see views over time per link in /analytics.",
      bullets: [
        "/share/$token viewer route",
        "Expiry + revocation controls",
        "Per-link engagement analytics",
      ],
      to: "/analytics",
      toLabel: "Open analytics →",
    },
    {
      kicker: "11 · Translate",
      title: "Multi-language decks, non-destructive.",
      body:
        "Overlay translations per slide via the AI/GlobalLink engine. Switch languages live, retry failed jobs, and export localized PPTX/PDF.",
      bullets: [
        "TranslateDrawer + LanguageSwitcher",
        "Per-slide language status badges",
        "GlobalLink connector at /admin/globallink",
      ],
      to: "/admin/globallink",
      toLabel: "Configure GlobalLink →",
    },
    {
      kicker: "12 · Rebrand",
      title: "Retone an entire deck in one click.",
      body:
        "The Rebrand action re-applies any brand mode across every slide with a live preview and an auto-snapshot for safe rollback.",
      bullets: [
        "Live preview before commit",
        "Auto version snapshot",
        "Works with client co-brand via LogoHub",
      ],
    },
  ];

  const surfaces: Array<{ to: string; label: string; blurb: string }> = [
    { to: "/", label: "Dashboard", blurb: "Recent decks, briefs, and quick actions." },
    { to: "/brief/new", label: "New brief", blurb: "Capture prospect, objective and archetype." },
    { to: "/atlas", label: "Atlas", blurb: "Every module variant grouped by family & section." },
    { to: "/library", label: "Library", blurb: "Reusable slide fragments and starters." },
    { to: "/imagery", label: "Imagery", blurb: "Approved photography, backdrops and lockups." },
    { to: "/knowledge", label: "Knowledge", blurb: "Oracle KB, brand guides, glossary, videos." },
    { to: "/admin", label: "Admin", blurb: "Users, approvals, A/B, imagery, Oracle, icons." },
    { to: "/admin/globallink", label: "GlobalLink", blurb: "Translation connector config & status." },
    { to: "/analytics", label: "Analytics", blurb: "Share-link views and deck engagement." },
    { to: "/templates", label: "Templates", blurb: "Team template gallery from duplicated decks." },
    { to: "/faq", label: "FAQ", blurb: "Step-by-step basics and common questions." },
  ];



  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-baseline justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-black/50">About</div>
            <h1 className="mt-3 text-5xl font-semibold leading-[1.05] tracking-[-0.02em]">
              A modular sales-deck system, built on TransPerfect brand.
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-black/65">
              This page grows as the build grows. It documents the systems underneath — briefs,
              modules, brand governance, imports, exports, and the AI layer — so anyone new to
              the platform can orient in one read.
            </p>
          </div>
          <Link
            to="/faq"
            className="shrink-0 rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-black/70 hover:border-black/30"
          >
            Step-by-step basics →
          </Link>
        </div>

        {/* Live stats */}
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-black/10 bg-white p-5"
            >
              <div className="text-4xl font-semibold tracking-tight text-[#003FC7]">
                {s.value}
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest text-black/50">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Pillars */}
        <section className="mt-16">
          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl font-semibold tracking-tight">How the platform works</h2>
            <div className="text-xs uppercase tracking-widest text-black/50">
              End-to-end
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {pillars.map((p) => (
              <article
                key={p.kicker}
                className="rounded-2xl border border-black/10 bg-white p-6"
              >
                <div className="text-[10px] font-medium uppercase tracking-widest text-[#003FC7]">
                  {p.kicker}
                </div>
                <h3 className="mt-2 text-xl font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-black/65">{p.body}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-black/70">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#003FC7]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                {p.to && p.toLabel && (
                  <Link
                    to={p.to}
                    className="mt-4 inline-block text-sm font-medium text-[#003FC7] hover:underline"
                  >
                    {p.toLabel}
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Surface map */}
        <section className="mt-16">
          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl font-semibold tracking-tight">Every surface, mapped</h2>
            <div className="text-xs uppercase tracking-widest text-black/50">Navigation</div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {surfaces.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="group rounded-xl border border-black/10 bg-white p-4 transition hover:border-[#003FC7]/40 hover:shadow-sm"
              >
                <div className="text-sm font-semibold text-black group-hover:text-[#003FC7]">
                  {s.label}
                </div>
                <div className="mt-1 text-xs text-black/55">{s.blurb}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Changelog */}
        <section className="mt-16">
          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl font-semibold tracking-tight">What's new</h2>
            <div className="text-xs uppercase tracking-widest text-black/50">
              This page grows with the build
            </div>
          </div>
          <ol className="mt-6 space-y-3">
            {CHANGELOG.map((c) => (
              <li
                key={`${c.date}-${c.title}`}
                className="grid gap-4 rounded-2xl border border-black/10 bg-white p-5 md:grid-cols-[8rem_1fr]"
              >
                <div className="font-mono text-xs uppercase tracking-widest text-black/45">
                  {c.date}
                </div>
                <div>
                  <div className="text-sm font-semibold">{c.title}</div>
                  <div className="mt-1 text-sm text-black/65">{c.body}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Stack */}
        <section className="mt-16 mb-8 rounded-2xl border border-black/10 bg-[#03002C] p-8 text-white">
          <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                Under the hood
              </div>
              <h2 className="mt-3 text-2xl font-semibold">Built on a modern edge stack.</h2>
              <p className="mt-3 text-sm text-white/70">
                TanStack Start on Cloudflare Workers, React 19, Tailwind v4, Zustand for the
                client deck state, Supabase for auth &amp; persistence, and pptxgenjs for
                client-side PowerPoint export.
              </p>
            </div>
            <ul className="grid gap-2 text-sm text-white/80">
              <li>· TanStack Router · file-based routes, typed loaders</li>
              <li>· React 19 · Suspense-first data loading</li>
              <li>· Tailwind v4 · design tokens in styles.css</li>
              <li>· Lucide · icon system + curated deck library</li>
              <li>· Supabase · Postgres, RLS, user roles</li>
              <li>· Lovable AI gateway · chat &amp; rewrite</li>
              <li>· pptxgenjs · client-side deck export</li>
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
