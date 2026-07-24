import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

type QA = { q: string; a: string };

const GUIDES: Array<{ title: string; blurb: string; steps: string[] }> = [
  {
    title: "Sign in for the first time",
    blurb: "Get into the workspace and set yourself up.",
    steps: [
      "Open the app and click Sign in on the header.",
      "Enter your TransPerfect email and password, or use the magic-link option.",
      'Check "Remember me on this device" so your email pre-fills next time.',
      "On first confirmed sign-in, @transperfect.com addresses are granted admin automatically.",
    ],
  },
  {
    title: "Run a master brief (one brief → full brand set)",
    blurb: "Produce a deck, print assets, event kit, and social kit from a single brief.",
    steps: [
      "Open New brief from the top navigation.",
      "Pick brand mode (division / sub-brand) and fill in prospect, industry, audience, and objective.",
      "In section 04 · Master set, toggle any of Presentation, Print, Event kit, Social kit.",
      "For Print, pick which asset kinds to seed (case study, spotlight, ebrochure, adaptor brief).",
      "Click Generate master set — the summary card lists every produced artifact with direct links.",
    ],
  },
  {
    title: "Build a presentation deck from a brief",
    blurb: "Deck-only flow, still under one minute.",
    steps: [
      "Open New brief and leave only Presentation checked in the master set.",
      "Fill prospect, industry, audience, and objective. Optional: attach knowledge context via Oracle synthesis.",
      "Review the suggested archetype — swap it if a different narrative fits.",
      "Click Generate — the deck opens in the editor with modules pre-assembled from Atlas.",
    ],
  },
  {
    title: "Edit a slide directly on the preview",
    blurb: "Live in-place editing without opening a side panel.",
    steps: [
      "Open a deck and click any text on the slide preview — it becomes editable in place.",
      "Use the floating palette to switch that slide to light or dark, or override text ink color.",
      "Open the Media panel to swap image, video, or background — all three are unified per slide.",
      "Use Copilot (glass drawer) to run natural-language edits: add slide, rewrite copy, swap variant, reorder.",
    ],
  },
  {
    title: "Personalize and swap module variants",
    blurb: "Fine-tune any slide without losing your content.",
    steps: [
      "Open the deck and select a module from the outline.",
      'Click "Swap variant" to see alternate layouts for the same narrative purpose.',
      "Edit copy directly on the preview — structured fields save on blur.",
      'Use "Personalize" to rewrite copy for the current prospect and industry.',
      "Reorder modules by dragging their handle in the outline.",
    ],
  },
  {
    title: "Create a print asset (case study, spotlight, ebrochure, adaptor brief)",
    blurb: "Long-form print with the same brand system.",
    steps: [
      "Open Print from the top nav and click New print asset — or start it from a master brief.",
      "Pick a kind: case study, spotlight, ebrochure, or adaptor brief.",
      "In the Print Studio editor, use the Content inspector to fill every field the template supports.",
      "Drag the hero handle up or down to resize the hero band (20–80% of the page).",
      "Toggle light/dark on the canvas, then Export PPTX / PDF / self-contained HTML.",
    ],
  },
  {
    title: "Build an event kit",
    blurb: "Signage, invites, and session decks from an event playbook.",
    steps: [
      "Open Event from the top nav to see all industry-standard event playbooks.",
      "Click a playbook to preview the full kit (formats, deliverables, division defaults).",
      "From a brief, attach an event playbook in section 04 · Master set to link it to the deck context.",
      "Deliverables render with the same Aurora system as slides — export or hand off.",
    ],
  },
  {
    title: "Build a social kit",
    blurb: "LinkedIn, Instagram, and launch cadence tied to a module or brief.",
    steps: [
      "Open Social from the top nav to browse division-scoped social playbooks.",
      "Filter by angle (launch, thought leadership, campaign, event).",
      "Click a playbook to preview the full kit against pre-existing modules.",
      "Alternatively: favorite modules from Presentation, then use Admin → Campaigns → Kit builder to package them.",
    ],
  },
  {
    title: "Import an existing PowerPoint",
    blurb: "Bring a legacy .pptx into the modular system.",
    steps: [
      "Open Presentation → Import (top-right of the library).",
      "Drop your .pptx file — up to 100 MB.",
      "The importer resolves master/layout inheritance and z-order, extracts images, and captures faithful layout.",
      "Review the mapping; override any mis-matched slide by picking a different variant.",
      "Click Assemble to create a deck you can personalize and export.",
    ],
  },
  {
    title: "Export a deck (PPTX / PDF / vector / present)",
    blurb: "Ship a branded deliverable that matches the on-screen preview.",
    steps: [
      "Open the deck and click Export in the toolbar.",
      "Choose PPTX (vector text + true font embedding), PDF, or Present (fullscreen).",
      "The preflight scan checks for CORS, missing media, and asset risks before rendering.",
      "Aurora backdrops, deterministic per-slide, are rasterized into the file so exports match the preview.",
    ],
  },
  {
    title: "Download a single module or download light + dark",
    blurb: "Grab any single slide from the library — light, dark, or both.",
    steps: [
      "Open Presentation → Library and hover a module card.",
      "Click Download and choose Light, Dark, or Both.",
      "PPTX (with vector text) or PNG (up to 4K via html-to-image) are both available.",
      "A toast tracks the export in progress — safe to keep browsing while it runs.",
    ],
  },
  {
    title: "Multi-select modules → new deck",
    blurb: "Compose a deck by hand from favorites or the library.",
    steps: [
      "Open Presentation → Library and toggle Select mode.",
      "Check multiple module variants — the floating action bar shows the count.",
      "Click New deck from selection — a deck is created with those modules in order.",
      "Open it and reorder / rebrand / translate as needed.",
    ],
  },
  {
    title: "Rebrand an existing deck or switch a single slide to dark",
    blurb: "Retone globally or one-off.",
    steps: [
      "Deck-wide: open the deck, choose Rebrand, pick a brand mode, preview live, commit — an auto-snapshot is written.",
      "Single slide: click the slide's Light/Dark toggle in the editor toolbar — persisted per-slide.",
      "Text ink override: use the floating palette on any live-edited slide to force ink color for that slide.",
    ],
  },
  {
    title: "Share a deck view-only",
    blurb: "Send a colleague a live link without giving them edit access.",
    steps: [
      "Open the deck and click Share in the top-right.",
      "Generate a link — optionally set an expiry.",
      "Copy the /share/$token URL and send it.",
      "Track views over time in Admin → Master analytics; revoke or regenerate the token at any point.",
    ],
  },
  {
    title: "Translate a deck",
    blurb: "Produce a localized version of a deck without touching the source.",
    steps: [
      "Open the deck and click Translate to open the drawer.",
      "Pick target languages; jobs run via the AI/GlobalLink engine.",
      "Use the language switcher in the toolbar to preview overlays live.",
      "Retry any failed slide from the job history, then export a localized PPTX or PDF.",
    ],
  },
  {
    title: "Review, comment, and approve",
    blurb: "Move a deck through the review workflow with your team.",
    steps: [
      "Open the deck and open the Comments panel on any slide.",
      "Leave threaded comments — reviewers get RLS-scoped access.",
      "Use ReviewStatusControl to move Draft → In review → Approved.",
      "Use Version history to compare and restore any snapshot non-destructively.",
    ],
  },
  {
    title: "Talk to Oracle (knowledge chat)",
    blurb: "Ask questions grounded on the embedded brand + division corpus.",
    steps: [
      "Open Admin → Knowledge → Ask Oracle (or use the Oracle prompt bar on the home hero).",
      "Type any question — retrieval runs hybrid search over PDFs, imported PPTX, and Oracle KB.",
      "Answers cite the source docs; open any snippet to jump into Knowledge.",
    ],
  },
  {
    title: "Configure GlobalLink (admin)",
    blurb: "Wire up the translation connector for the workspace.",
    steps: [
      "Go to Admin → Translation → GlobalLink.",
      "Set the API base URL, project code, and callback secret; add the API key as a secret.",
      "Save the settings — the status badge flips to Connected once the required secrets are present.",
      "Click Test connection to probe the API and confirm the credentials.",
    ],
  },
  {
    title: "Sync Oracle KB into Knowledge (admin)",
    blurb: "Promote a vetted Oracle entry into the live Knowledge system.",
    steps: [
      "Go to Admin → Knowledge → Oracle KB.",
      "Search or filter for the entry you want to promote.",
      'Open the entry and click "Sync to Knowledge".',
      "Review the mapped fields and confirm; the entry becomes searchable app-wide.",
    ],
  },
  {
    title: "Track usage in Master analytics",
    blurb: "See which modules, divisions, and users drive the most output.",
    steps: [
      "Open Admin → Analytics → Master analytics.",
      "Filter by division, time range, or module family.",
      "Trend cards show usage over time, power users, and hot modules.",
      "Drill into any module to see per-slide events (view, edit, export).",
    ],
  },
];


const FAQS: Array<{ section: string; items: QA[] }> = [
  {
    section: "Getting started",
    items: [
      {
        q: "What is TransPerfect Modular?",
        a: "A modular brand-production system for TransPerfect. One brief can generate a presentation deck, print assets, an event kit, and a social kit — every artifact assembles from the same governed modules, brand tokens, and knowledge context.",
      },
      {
        q: "Who can access the app?",
        a: "Anyone with a TransPerfect email can sign up. Admin privileges are granted automatically for @transperfect.com addresses on first confirmed sign-in.",
      },
      {
        q: "What are the four surfaces in the top nav?",
        a: "Presentation (decks + module library + Atlas), Print (long-form print studio), Event (event playbooks and kits), and Social (division-scoped social playbooks). All four share the same brief, brand modes, and knowledge base.",
      },
      {
        q: "What's a master brief?",
        a: "A single brief that fans out into every surface you check. Fill it once and toggle Presentation / Print / Event kit / Social kit in section 04 — the summary card links every produced artifact.",
      },
    ],
  },
  {
    section: "Presentation & modules",
    items: [
      {
        q: "What is a module variant?",
        a: "A single vetted slide layout tied to a narrative purpose — e.g. cover, pillars, KPI dashboard, chart, locations, quote, closing. Every variant renders from structured content, so swapping variants keeps your data intact.",
      },
      {
        q: "Can I edit slides directly on the preview?",
        a: "Yes. Click any text on the preview to edit in place. A floating palette lets you flip that slide to light/dark or override the ink color — persisted per slide.",
      },
      {
        q: "How do I compose a deck by hand?",
        a: "Open Presentation → Library, toggle Select mode, check any modules, and click New deck from selection. Reorder / rebrand / translate from there.",
      },
      {
        q: "Can I download a single module?",
        a: "Yes — hover any card in the library and click Download. Choose Light, Dark, or Both, in PPTX (with vector text) or PNG (up to 4K).",
      },
      {
        q: "Can I import an existing PowerPoint?",
        a: "Yes. Presentation → Import accepts up to 100 MB .pptx. The importer resolves master/layout inheritance and z-order, extracts images, and auto-maps slides to module variants for review before assembly.",
      },
    ],
  },
  {
    section: "Print Studio",
    items: [
      {
        q: "What can I produce in Print Studio?",
        a: "Case studies, client spotlights, ebrochures, and adaptor briefs — long-form print built on the same Aurora brand system as decks.",
      },
      {
        q: "How do I edit a print asset?",
        a: "Open the asset from Print. The editor uses collapsible cards and a scaled preview. Every schema field has an editing path via the Content inspector — nothing is dead content.",
      },
      {
        q: "How do I resize the hero band?",
        a: "Drag the hero handle up or down on the canvas — the hero can be anywhere from 20% to 80% of the page. Sizing is persisted per asset.",
      },
      {
        q: "How do I export print?",
        a: "PPTX with vector text and Geist TTF embedding, PDF, or a self-contained HTML file. The dark-mode footer forces white text and logos in enterprise sets.",
      },
    ],
  },
  {
    section: "Event & Social",
    items: [
      {
        q: "What lives in Event?",
        a: "A gallery of industry-standard event playbooks — 8+ archetypes, each with formats, deliverables, and division defaults. Click any playbook to preview the end-to-end kit.",
      },
      {
        q: "What lives in Social?",
        a: "9 division-scoped social playbooks (LinkedIn, Instagram, launch cadences, event trails). Filter by angle: launch, thought leadership, campaign, event. Every playbook references existing modules so nothing is off-brand.",
      },
      {
        q: "How do I turn favorited modules into a social kit?",
        a: "Favorite modules in Presentation, then open Admin → Campaigns → Kit builder. Source content (title, summary, stats) is extracted into copy slots for named bundles (Social essentials, Event kit).",
      },
    ],
  },
  {
    section: "Editor & Copilot",
    items: [
      {
        q: "How does Copilot work?",
        a: "A glass drawer in the deck editor executes natural-language instructions via tool-use — add / edit / reorder slides, swap variants, rewrite copy. Every action is applied through the same store operations as manual edits, so undo/redo works uniformly.",
      },
      {
        q: "Can I switch a single slide to dark mode?",
        a: "Yes. The slide toolbar has a Light/Dark toggle that persists per slide. Text ink can also be overridden per slide from the floating palette.",
      },
      {
        q: "Where do image, video, and background settings live?",
        a: "All three are unified in a single tabbed Media panel per slide. Videos autoplay in previews with a visible Play overlay; playback state is isolated per slide.",
      },
      {
        q: "How do I add pins or edit map data on a locations slide?",
        a: "Open the Locations slide, open the Pin editor panel, and add / drag / edit pins and regional metrics. The Locations family (Region focus, Hub & Spoke, World stats) shares the same data model as the KPI and chart modules.",
      },
    ],
  },
  {
    section: "Collaboration & sharing",
    items: [
      {
        q: "How do I share a deck without giving edit access?",
        a: "Click Share on the deck and generate a token. You'll get a /share/$token URL you can send. Set an expiry, revoke, or regenerate anytime — views are tracked in Admin → Master analytics.",
      },
      {
        q: "Can teammates comment on a deck?",
        a: "Yes. Open Comments on any slide to leave threaded comments. Move the deck through Draft → In review → Approved using ReviewStatusControl. All access is enforced at the RLS layer.",
      },
      {
        q: "Is there version history and undo?",
        a: "Yes. Autosave writes snapshots as you work; Version history lets you restore any snapshot non-destructively. The editor also has session Undo/Redo.",
      },
    ],
  },
  {
    section: "Translation & GlobalLink",
    items: [
      {
        q: "How do I translate a deck?",
        a: "Open the Translate drawer on any deck, pick target languages, and let the AI/GlobalLink engine produce overlays. Preview live with the language switcher and export a localized PPTX or PDF.",
      },
      {
        q: "Are translations destructive?",
        a: "No. Translations are stored as per-slide overlays. The source deck is never overwritten, and you can switch languages live or retry failed jobs from job history.",
      },
      {
        q: "How do I configure GlobalLink?",
        a: "Admin → Translation → GlobalLink. Set the API base URL, project code, and callback secret; add the API key as a secret. The status badge flips to Connected once the required secrets are present, and Test connection probes the API.",
      },
    ],
  },
  {
    section: "Rebrand, templates & duplication",
    items: [
      {
        q: "Can I retone an entire deck to a different brand?",
        a: "Yes. Use Rebrand in the editor toolbar to preview a target brand mode live across every slide. Committing writes an auto-snapshot for rollback.",
      },
      {
        q: "Can I duplicate a deck or save it as a template?",
        a: "Yes. Duplicate any deck from the deck menu, and flag it as a team template. Templates surface in /templates for anyone in the workspace to start from.",
      },
    ],
  },
  {
    section: "Knowledge, RAG & Oracle",
    items: [
      {
        q: "What's the difference between Knowledge and Oracle KB?",
        a: "Knowledge is the app's live entry system used by search, briefs, and generation. Oracle KB is a read-only imported snapshot. Admins can sync individual Oracle entries into Knowledge from Admin → Knowledge → Oracle KB.",
      },
      {
        q: "Where does brand intelligence come from?",
        a: "The brand_intelligence table holds per-entity summaries. It powers the Oracle overview and division scoping but does not drive generation directly — RAG retrieval does.",
      },
      {
        q: "What's embedded into the RAG index?",
        a: "Division PDFs and per-division imported PPTX decks, chunked and embedded with gemini-embedding-001 (3072-dim). Deep RAG synthesis runs the reasoning pass over the retrieved documents with hybrid retrieval.",
      },
      {
        q: "How do I add division-specific imagery?",
        a: "Admin → Brand assets → Imagery. Upload assets against a division; they appear as a searchable Team library inside the Media panel in the editor.",
      },
      {
        q: "Do we still call BrandHub at runtime?",
        a: "No. All ~405 logos, 111k+ icons, brand intel, and source documents were migrated in-project. The app owns every asset — no runtime dependency on external systems.",
      },
    ],
  },
  {
    section: "Analytics",
    items: [
      {
        q: "Where do I see usage analytics?",
        a: "Admin → Analytics → Master analytics. It tracks per-module usage, per-division activity, power users, hot modules, share-link views, and time-based trends via the usage_events pipeline.",
      },
      {
        q: "How is deck engagement tracked?",
        a: "Every share-link view, deck open, and slide interaction writes to usage_events. Filter by division, module family, or user to surface trends and outliers.",
      },
    ],
  },
  {
    section: "Exports & presenting",
    items: [
      {
        q: "How do I export to PowerPoint?",
        a: "Open any deck and click Export. A preflight scan checks for CORS and asset risks before rendering a branded .pptx with vector text and Geist TTF embedding. Deterministic Aurora backdrops are rasterized so exports match the preview.",
      },
      {
        q: "Which image formats can I upload?",
        a: "JPEG, PNG, WebP, GIF (passthrough), AVIF (rasterized), and SVG (vector-preserving passthrough — rasterized on-the-fly during PPTX export). Video (MP4/WebM) is supported build-wide.",
      },
      {
        q: "Is there a presenter view?",
        a: "Yes. Presenter view runs the deck fullscreen with speaker notes and keyboard navigation. Present mode is also available for a clean fullscreen show.",
      },
      {
        q: "Can I export prints as self-contained HTML?",
        a: "Yes. Print Studio can export a fully self-contained HTML file (fonts, images, and Aurora backdrops inlined) alongside PPTX and PDF.",
      },
    ],
  },
  {
    section: "Account & admin",
    items: [
      {
        q: "How do I stay signed in?",
        a: 'Check "Remember me on this device" at sign-in. Your email will be pre-filled next time.',
      },
      {
        q: "How do I get admin access?",
        a: "Ask an existing workspace admin from Admin → Governance → Users. TransPerfect email addresses receive admin automatically once their email is confirmed.",
      },
      {
        q: "What's in the Admin sidebar?",
        a: "Overview (command center, Atlas, Templates, Print Studio, Audit log), Analytics (Master analytics, deck engagement, AI usage, A/B), Knowledge (hub, entries, Oracle, KB manager, approvals), Brand assets (assets, guides, LogoHub, Icon Studio, PDF ingestion), Translation, and Governance.",
      },
      {
        q: "How do breadcrumbs work?",
        a: "Every page under the header shows a breadcrumb trail — Home / section / current — with friendly labels for deck titles, playbook names, and admin sections. Click any crumb to jump back up the tree.",
      },
      {
        q: "Can I install this as an app?",
        a: 'Yes. On iOS use Safari → Share → "Add to Home Screen". On Android/desktop Chrome, use the install icon in the address bar. Offline is not supported.',
      },
    ],
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Frequently asked questions about TransPerfect Modular: master briefs, presentation decks, print studio, event and social kits, translation, knowledge, and admin.",
      },
      { property: "og:title", content: "FAQ · TransPerfect Modular" },
      {
        property: "og:description",
        content:
          "Frequently asked questions about TransPerfect Modular: master briefs, presentation decks, print studio, event and social kits, translation, knowledge, and admin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.flatMap((s) =>
            s.items.map((qa) => ({
              "@type": "Question",
              name: qa.q,
              acceptedAnswer: { "@type": "Answer", text: qa.a },
            })),
          ),
        }),
      },
    ],
  }),
  component: FAQPage,
});

function FAQPage() {
  return (
    <AppShell>
      <div className="flex items-baseline justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-black/50">Support</div>
          <h1 className="mt-3 text-4xl font-semibold">Frequently asked questions</h1>
          <p className="mt-3 max-w-2xl text-black/60">
            Answers about master briefs, presentation decks, print studio, event & social kits, translation, knowledge, and administration. Can't find
            what you need?{" "}
            <Link to="/knowledge" className="font-medium text-[#003FC7] hover:underline">
              Browse the knowledge base
            </Link>
            .
          </p>
        </div>
        <Link
          to="/about"
          className="rounded-full border border-black/15 px-4 py-2.5 text-sm text-black/70 hover:border-black/40"
        >
          About the platform →
        </Link>
      </div>

      <div className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[#003FC7]">Step-by-step basics</h2>
          <span className="text-xs text-black/40">{GUIDES.length} guides</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {GUIDES.map((g, gi) => (
            <article
              key={g.title}
              className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#003FC7] text-xs font-semibold text-white">
                  {String(gi + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold text-black/90">{g.title}</h3>
              </div>
              <p className="mt-2 text-sm text-black/60">{g.blurb}</p>
              <ol className="mt-4 space-y-2 text-sm text-black/75">
                {g.steps.map((s, si) => (
                  <li key={si} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 text-xs font-semibold tabular-nums text-[#003FC7]">
                      {si + 1}.
                    </span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-14">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[#003FC7]">Common questions</h2>
      </div>

      <div className="mt-4 space-y-10">
        {FAQS.map((section) => (
          <section key={section.section}>
            <h3 className="text-sm font-semibold text-black/80">{section.section}</h3>
            <div className="mt-3 divide-y divide-black/10 overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
              {section.items.map((qa, i) => (
                <details key={i} className="group open:bg-black/[0.02]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left">
                    <span className="text-base font-medium text-black/90">{qa.q}</span>
                    <span
                      aria-hidden
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-black/15 text-black/60 transition group-open:rotate-45 group-open:border-[#003FC7] group-open:text-[#003FC7]"
                    >
                      +
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-sm leading-relaxed text-black/70">{qa.a}</div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
