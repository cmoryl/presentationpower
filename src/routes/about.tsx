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
          "How TransPerfect Modular works — master briefs that fan out into Presentation, Print, Event, and Social; live editing, Copilot, translation, knowledge and analytics.",
      },
      { property: "og:title", content: "About · TransPerfect Modular" },
      {
        property: "og:description",
        content:
          "A living overview of the platform: master briefs, modules, print studio, event & social kits, translation, knowledge, and the AI layer.",
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
    title: "Build-wide breadcrumbs",
    body: "A shared breadcrumb trail resolves dynamic segments — deck titles, playbook names, admin sections — with friendly labels and fallback shortened IDs across every route.",
  },
  {
    date: "2026-07",
    title: "Master brief flow (Presentation + Print + Event + Social)",
    body: "One brief can fan out into a deck, print assets (case study, spotlight, ebrochure, adaptor brief), an event kit, and a social kit — with a single production summary linking every artifact.",
  },
  {
    date: "2026-07",
    title: "Modular Command Center home",
    body: "Signed-in home rebuilt as an interactive mode hero, Oracle prompt bar, AI suite catalog, and a large MODULAR watermark threaded through the surfaces.",
  },
  {
    date: "2026-07",
    title: "Event & Social surfaces",
    body: "New /events with 8+ industry-standard event playbooks and full kit previews; new /social with 9 division-scoped playbooks filtered by launch / thought leadership / campaign / event angles.",
  },
  {
    date: "2026-07",
    title: "Admin sidebar + Master Analytics + Master Knowledge",
    body: "Left-sidebar admin shell with persisted state, a Master Analytics command center over the usage_events pipeline (per-module, per-division, power users, hot modules), and a consolidated Master Knowledge hub.",
  },
  {
    date: "2026-07",
    title: "Print Studio + vector text export",
    body: "Long-form print (case study, spotlight, ebrochure, adaptor brief) with dnd-kit drag-and-drop, Content inspector for every schema field, drag-to-resize hero (20–80%), and vector text overlay via pdf-lib + Geist TTF embedding. Self-contained HTML export included.",
  },
  {
    date: "2026-07",
    title: "Locations family with map + pin editor",
    body: "Region Focus, Hub & Spoke, and World Stats slides share the KPI/chart data model. Pin editor panel for placement and regional metrics; HD/4K PNG export via html-to-image.",
  },
  {
    date: "2026-07",
    title: "Live preview editing + per-slide light/dark + ink override",
    body: "Click any text on the slide preview to edit in place. Floating palette flips a single slide to light/dark, or overrides ink color — all persisted per slide.",
  },
  {
    date: "2026-07",
    title: "Free-form Aurora v2 across data & chart modules",
    body: "KPI Dashboard rebuilt as a bento infographic mosaic. Chart batches (line/column, gauge, donut trio, breakdown, report cards, locations) share edge-bleed feathered blooms with liquid-glass surfaces.",
  },
  {
    date: "2026-07",
    title: "Unified Media panel (image · video · background)",
    body: "One tabbed panel per slide replaces three redundant editors. Video autoplays in previews with a visible Play overlay and isolated playback state.",
  },
  {
    date: "2026-07",
    title: "Multi-select → new deck + favorites → social kit",
    body: "Select multiple library modules to compose a deck by hand. Favorite modules and package them into named bundles (Social essentials, Event kit) via Admin → Campaigns → Kit builder.",
  },
  {
    date: "2026-07",
    title: "PPTX import: faithful layout capture + 100 MB limit",
    body: "Imports resolve master/layout inheritance and z-order, extract images, and capture faithful layout. Upload cap raised to 100 MB.",
  },
  {
    date: "2026-07",
    title: "Deck engagement & analytics via usage_events",
    body: "Every share-link view, deck open, module usage and slide interaction writes to usage_events. Master Analytics filters by division, module family, and user.",
  },
  {
    date: "2026-07",
    title: "AI Roadmap Phases B–F complete",
    body: "Narrative Strategist (deck architecture), Deep RAG synthesis (hybrid retrieval), Conversational deck Copilot, Semantic icon + logo suggestions, and Oracle knowledge chat — all routed via the Lovable AI gateway.",
  },
  {
    date: "2026-07",
    title: "BrandHub fully migrated in-project",
    body: "~405 logos, 111k+ icons, brand intel and source documents migrated locally. No runtime dependency on BrandHub.",
  },
  {
    date: "2026-07",
    title: "GlobalLink translation engine + multi-language decks",
    body: "Non-destructive per-slide translation overlays, live language switcher, retryable job history, localized PPTX/PDF exports, and admin at /admin/globallink.",
  },
  {
    date: "2026-07",
    title: "Deck duplication, templates, presenter view, rebrand",
    body: "Duplicate any deck, flag as team template, browse /templates, run Presenter view, and Rebrand a deck to any brand mode with a live preview and auto-snapshot rollback.",
  },
  {
    date: "2026-07",
    title: "Shareable links + review workflow",
    body: "View-only /share/$token viewer with expiry, revocation and token regeneration. deck_comments + ReviewStatusControl for Draft → In review → Approved.",
  },
  {
    date: "2026-07",
    title: "Batch PDF ingestion + embeddings",
    body: "Division PDFs processed with Gemini, chunks embedded with gemini-embedding-001 (3072-dim) across all 10 divisions. Sources surface per-division in /admin/knowledge.",
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
      kicker: "02 · Master set",
      title: "One brief, every surface.",
      body:
        "Toggle Presentation, Print, Event kit, and Social kit in section 04 of the brief and fan out the whole brand set in one pass — every artifact links back to the same brief and knowledge context.",
      bullets: [
        "Deck + Case study + Spotlight + EBrochure + Adaptor brief",
        "Event playbook attachment",
        "Social kit generation with copy slot mapping",
      ],
      to: "/brief/new",
      toLabel: "Run a master brief →",
    },
    {
      kicker: "03 · Assemble",
      title: "Modular decks from a governed library.",
      body:
        "Assemble picks module variants across section frameworks — Opening, Context, Solution, Process, Proof, Decision, Close — and each variant declares which layouts, tokens, and icons it permits.",
      bullets: [
        `${MODULE_VARIANTS.length} variants across ${SECTION_FRAMEWORKS.length} sections`,
        "Layout & token constraints enforced at render",
        "Multi-select → new deck from the library",
      ],
      to: "/atlas",
      toLabel: "Browse the atlas →",
    },
    {
      kicker: "04 · Live edit",
      title: "Edit directly on the preview.",
      body:
        "Click any text on the slide to edit in place. Toggle a single slide to light or dark, override ink color, and manage image / video / background from one unified Media panel per slide.",
      bullets: [
        "Per-slide light/dark toggle + ink override",
        "Unified Media panel (image · video · background)",
        "Session Undo/Redo + autosave version snapshots",
      ],
    },
    {
      kicker: "05 · Copilot",
      title: "Natural-language deck editing.",
      body:
        "A glass drawer in the editor accepts prompts and executes tool-use actions — add / edit / reorder slides, swap variants, rewrite copy. Every change flows through the same store as manual edits.",
      bullets: [
        "Runs on the Lovable AI gateway",
        "Per-field change log with revert",
        "Grounded on brief + RAG knowledge",
      ],
    },
    {
      kicker: "06 · Print Studio",
      title: "Long-form print, same brand system.",
      body:
        "Case studies, spotlights, ebrochures, and adaptor briefs with dnd-kit editing, drag-to-resize hero (20–80%), and a Content inspector that guarantees every schema field has an editing path.",
      bullets: [
        "Vector text via pdf-lib + Geist TTF embedding",
        "PPTX · PDF · self-contained HTML export",
        "Persisted editor mode + export settings",
      ],
      to: "/library/print",
      toLabel: "Open Print →",
    },
    {
      kicker: "07 · Events & Social",
      title: "Playbooks, not blank pages.",
      body:
        "8+ industry-standard event playbooks with full kit previews, and 9 division-scoped social playbooks filterable by launch / thought leadership / campaign / event angle.",
      bullets: [
        "Event kits: signage, invites, session decks",
        "Social kits reference existing modules",
        "Favorites → named social bundles",
      ],
      to: "/events",
      toLabel: "Open Events →",
    },
    {
      kicker: "08 · Import & export",
      title: "Faithful PPTX import, honest exports.",
      body:
        "Import up to 100 MB .pptx — master/layout inheritance and z-order are resolved, images are extracted, slides auto-map to variants. Exports render deterministic Aurora backdrops so files match previews.",
      bullets: [
        "PPTX vector text + Geist TTF embedding",
        "PDF, self-contained HTML, PNG (HD/4K)",
        "Preflight scan for CORS & asset risks",
      ],
      to: "/decks/import",
      toLabel: "Import a deck →",
    },
    {
      kicker: "09 · Knowledge & Oracle",
      title: "Grounded on the owned corpus.",
      body:
        "Division PDFs and imported PPTX are chunked and embedded with gemini-embedding-001 (3072-dim). Oracle chat and Deep RAG synthesis run hybrid retrieval over the full corpus — no external BrandHub call at runtime.",
      bullets: [
        "Per-division PDF & PPTX embeddings",
        "Oracle knowledge chat with citations",
        "Semantic icon + logo suggestions",
      ],
      to: "/knowledge",
      toLabel: "Open knowledge →",
    },
    {
      kicker: "10 · Locations & data",
      title: "Maps, KPIs, and charts on one data model.",
      body:
        "Region Focus, Hub & Spoke, and World Stats share the same regional metric fields as the KPI dashboard and chart batches. Pin editor for placements and metrics; HD/4K PNG export.",
      bullets: [
        "Free-form Aurora v2 across data modules",
        "Bento KPI dashboard mosaic",
        "Deterministic per-slide backdrops",
      ],
    },
    {
      kicker: "11 · Translate & rebrand",
      title: "Localize and retone non-destructively.",
      body:
        "AI/GlobalLink overlays translate a deck per-slide with retryable jobs. Rebrand re-applies any brand mode across every slide with a live preview and auto-snapshot rollback.",
      bullets: [
        "Per-slide language status + localized exports",
        "GlobalLink connector at /admin/globallink",
        "Auto version snapshot on rebrand",
      ],
      to: "/admin/globallink",
      toLabel: "Configure GlobalLink →",
    },
    {
      kicker: "12 · Collaboration & share",
      title: "Comments, reviews, share links.",
      body:
        "Threaded comments per slide, ReviewStatusControl for Draft → In review → Approved, and view-only /share/$token URLs with expiry, revocation, and per-link analytics.",
      bullets: [
        "deck_comments with CommentsPanel",
        "Non-destructive version restore",
        "Share tokens tracked in Master Analytics",
      ],
    },
    {
      kicker: "13 · Governance & Analytics",
      title: "Admin sidebar, master hubs, deep analytics.",
      body:
        "Left-sidebar admin shell with Overview, Analytics, Knowledge, Brand assets, Translation, Governance. Master Analytics tracks per-module usage, per-division activity, power users, hot modules, and trends over the usage_events pipeline.",
      bullets: [
        "User roles in user_roles (RLS-safe)",
        "Icon Studio + LogoHub + Brand guides",
        "Deck engagement + AI usage + A/B",
      ],
      to: "/admin",
      toLabel: "Open admin →",
    },
  ];

  const surfaces: Array<{ to: string; label: string; blurb: string }> = [
    { to: "/", label: "Home", blurb: "Modular command center with mode hero and Oracle prompt." },
    { to: "/brief/new", label: "New brief", blurb: "Master brief — fan out into every surface." },
    { to: "/library", label: "Presentation", blurb: "Module library, decks, multi-select assembly." },
    { to: "/atlas", label: "Atlas", blurb: "Every module variant grouped by family & section." },
    { to: "/library/print", label: "Print", blurb: "Case study, spotlight, ebrochure, adaptor brief." },
    { to: "/events", label: "Event", blurb: "Event playbooks and full kit previews." },
    { to: "/social", label: "Social", blurb: "Division-scoped social playbooks and kits." },
    { to: "/templates", label: "Templates", blurb: "Team template gallery from duplicated decks." },
    { to: "/knowledge", label: "Knowledge", blurb: "Oracle KB, brand guides, glossary, ask Oracle." },
    { to: "/admin", label: "Admin", blurb: "Sidebar hubs — analytics, knowledge, brand, translation, governance." },
    { to: "/admin/analytics", label: "Master analytics", blurb: "Usage, trends, power users, hot modules." },
    { to: "/admin/globallink", label: "GlobalLink", blurb: "Translation connector config & status." },
    { to: "/faq", label: "FAQ", blurb: "Step-by-step basics and common questions." },
  ];




  return (
    <AppShell>
      <header className="full-bleed relative -mt-6 mb-10 overflow-hidden border-b border-black/5 bg-gradient-to-br from-[#003FC70a] via-white/70 to-[#A1FBF922] px-6 py-14 sm:-mt-10 sm:px-12 lg:px-24 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-baseline justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-black/50">About</div>
              <h1 className="mt-3 text-5xl font-semibold leading-[1.05] tracking-[-0.02em] sm:text-6xl">
                A modular brand production system — Presentation, Print, Event, Social.
              </h1>
              <p className="mt-4 max-w-3xl text-lg text-black/65">
                One brief fans out into every surface. This page documents the systems underneath —
                master briefs, modules, brand governance, print studio, event & social kits, translation,
                knowledge, live editing, Copilot, and analytics — so anyone new to the platform can
                orient in one read.
              </p>
            </div>
            <Link
              to="/faq"
              className="shrink-0 rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-black/70 hover:border-black/30"
            >
              Step-by-step basics →
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl">

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
