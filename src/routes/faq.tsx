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
  {
    title: "Build a solution proposal (print)",
    blurb: "A division-specific master proposal you can edit page by page.",
    steps: [
      "Open Print → New print asset and pick Solution proposal, or seed one from a master brief.",
      "The editor opens one page at a time; use the thumbnail rail to jump between pages.",
      "Edit headlines, scope tables, and logos in place — the logo list lets you add, remove, and reorder client marks.",
      "On the locations page, drag pins on the vector world map to add or move offices.",
      "Enter rates and quantities on the cost page — totals recalculate automatically.",
      "Use Export proposal for a layered, editable PPTX or a print-ready PDF.",
    ],
  },
  {
    title: "Reuse a print section module",
    blurb: "Drop a governed print section into any asset instead of rebuilding it.",
    steps: [
      "Open Print → Modules to browse the print section module library.",
      "Preview a module at real page scale and check which fields it exposes.",
      "Insert it into the asset you're editing — copy is normalized so every field stays editable.",
      "Adjust the hero band and section order; the auto-fit engine rescales type to keep the page clean.",
    ],
  },
  {
    title: "Choose a style pack (including the Element skin)",
    blurb: "30 approved packs, S01–S30, plus per-industry recipes.",
    steps: [
      "Open Template Studio (Looks) to compare packs side by side on real slides.",
      "In a deck, use Look & feel in the toolbar to switch packs live — geometry and type stay locked to the pack.",
      "Pick Element System · Light (S29) or Element System · Dark (S30) for Element product marketing — these use the Element five-brick logo, never the TransPerfect wordmark.",
      "Style packs and industry recipes are independent: changing the pack does not change the industry background family.",
    ],
  },
  {
    title: "Build a deck with the presentation agent",
    blurb: "Chat your way to a finished, on-brand deck.",
    steps: [
      "Open Agent from the Elements menu and describe the deck, audience, and length.",
      "Review the proposed outline — approve, trim, or reorder sections in the chat.",
      "The agent picks a style pack and section templates, then writes the slides with charts and stats populated.",
      "Open the generated deck in the editor to fine-tune, or ask the agent to revise specific slides.",
    ],
  },
  {
    title: "Design freely in Open Canvas Studio (admin)",
    blurb: "Full canvas control when a module isn't enough.",
    steps: [
      "Go to Admin → Brand assets → Open Canvas Studio.",
      "Drag blocks from the palette onto the canvas; snapping, guides, and z-order controls keep placement exact.",
      "Use the Layers and Inspect panels in the right rail for stacking and precise geometry.",
      "Run AI Refit to rebalance a crowded canvas, then export — canvas blocks export as editable PPTX shapes.",
    ],
  },
  {
    title: "Author a reusable module in Module Studio (admin)",
    blurb: "Turn a one-off layout into a governed library module.",
    steps: [
      "Go to Admin → Brand assets → Module Studio.",
      "Compose the layout, then map each element to a schema field so the module stays editable everywhere.",
      "Preview across light/dark and multiple style packs to confirm it holds up.",
      "Save it into the library — it becomes selectable in decks, print, and social.",
    ],
  },
  {
    title: "Render a library module into a social post",
    blurb: "Any module, resized correctly for any social format.",
    steps: [
      "Open Social → Modules to open the Social Module Studio.",
      "Pick the target format (LinkedIn, Instagram square, story, banner).",
      "Choose a library module — the fit engine re-lays it out for the new aspect ratio.",
      "If the copy is too long for the frame, run AI Refit; then edit anything directly on the canvas.",
    ],
  },
  {
    title: "Check the certified PowerPoint view before export",
    blurb: "See exactly what PowerPoint will render, layer by layer.",
    steps: [
      "Open a deck and switch to the certified preview from the editor toolbar.",
      "The slide renders at true 1:1 export scale using the export pipeline, not the web preview.",
      "Open the Layers inspector to confirm every text frame, image, and surface is present and editable.",
      "Fix anything flagged, then export — decks and solution proposals both export as layered, editable PPTX.",
    ],
  },
  {
    title: "Add slide transitions and section cues",
    blurb: "Premium playback without hurting performance.",
    steps: [
      "In the editor, open Motion on the slide toolbar and pick a transition type and speed.",
      "Set a deck default so new slides inherit it, and override individual slides where needed.",
      "Transitions are compositor-only and automatically disabled when the viewer prefers reduced motion.",
      "Present or share the deck — section cues appear briefly at chapter changes and export as native PowerPoint transitions.",
    ],
  },
  {
    title: "Work on a phone or tablet",
    blurb: "What's practical on small screens.",
    steps: [
      "Use the hamburger menu for the Elements and Admin sections — every top-level surface is in the sheet.",
      "Browsing, reviewing, presenting, and sharing all work at phone width.",
      "Editor and studio surfaces stack vertically on phones, but canvas editing is still best on a desktop.",
      "Admin tables scroll horizontally so dense data stays readable.",
    ],
  },
  {
    title: "Build the NEXT London signage kit",
    blurb: "Panels, walls and vinyls for the QEII Centre, ready for the printer.",
    steps: [
      "Open Event → NEXT → London. The page always shows the revision currently in force, so what you see is what the printer has.",
      "Click any panel thumbnail to enlarge it, or open the live editor to move and resize headline, caption and QR blocks.",
      "Switch between screen preview and print preview to check trim, bleed and safe-area guides at the real signboard size.",
      "Download a panel as SVG, .ai or PNG — every file passes the signage QA gate first, and copy is written as outlined vector paths so no font is needed downstream.",
      "Files are stamped with the published revision number; unpublished work saves as rdraft- so a number is never claimed before it exists.",
    ],
  },
  {
    title: "Publish a signage revision",
    blurb: "Change artwork after the pack has gone out, without confusing the vendor.",
    steps: [
      "Open Event → NEXT → London → Revise.",
      "Edit panel copy, placements, board sizes or step-and-repeat recipes — removals stay removed in every later revision.",
      "Add a note describing what changed, then publish. The revision list is append-only, so history is never overwritten.",
      "Publishing pushes live: the public London page and any open editor refresh to the new revision immediately.",
    ],
  },
  {
    title: "Design step-and-repeat walls, door vinyls and pillars",
    blurb: "Large-format pieces with tile control and real inch readouts.",
    steps: [
      "In the London hub, pick the wall, vinyl or pillar you want and open its editor.",
      "For walls, choose staggered or tiled, then set tile size, spacing and rotation — inch readouts update as you drag.",
      "For pillars, set the vertical copy, its size and position, and the QR block with its own centring controls.",
      "Preview at print scale, then download the master. Booth panels keep the vendor's supplied artwork embedded.",
    ],
  },
  {
    title: "Create multi-day, multi-page agendas",
    blurb: "Session schedules that print and export cleanly.",
    steps: [
      "Open Event → NEXT → Agendas.",
      "Add a day, then add sessions with time, title, speaker and room; pages break automatically when a day runs long.",
      "Switch light/dark to check both faces, and use the division listing to produce a division-branded agenda.",
      "Export as a deck, a print PDF, or push it to the hub preview cards — hub cards refresh as soon as you save.",
    ],
  },
  {
    title: "Produce floor maps for attendees",
    blurb: "Top-down venue maps per floor, with or without signage marks.",
    steps: [
      "Open Event → NEXT → London → Maps. Pick a floor and filter by area category.",
      "Turn on rooms-only for attendee-facing maps — signage assets and their legend drop out, leaving room keys and pins.",
      "Use the design panel to set venue and event name, logo, logo height, single-ink mode and the brand colour strip.",
      "Draw or drag custom areas, drop area icons, then export as PDF, SVG, CSV or a ZIP of every floor.",
    ],
  },
  {
    title: "Export city badges for press",
    blurb: "Delegate badges as a print-ready pack.",
    steps: [
      "Open Event → NEXT → City badges and choose a city version.",
      "Authoring guides are off by default and never rasterise into the file even when switched on.",
      "Download the pack. The READ-ME states the true standard of the file you received.",
      "If the PDF/X-4 wrap fails (usually offline) the zip is prefixed UNWRAPPED- and you are warned — re-export online before sending to press.",
    ],
  },
  {
    title: "Build a deck from ChatGPT (or any MCP client)",
    blurb: "Use the connector when you'd rather not open the app.",
    steps: [
      "Add the Element connector in your assistant, pointing at the app's /mcp endpoint, and sign in when prompted.",
      "Describe the deck you want — audience, division, story, length. The connector plans sections and picks module variants.",
      "It prefers modules with a native PowerPoint renderer, so what you download matches what the app would render.",
      "You get a download link to a complete, layered, editable .pptx — that file is the deliverable, not a preview.",
      "Only if a large share of slides use heavy design plates will it also offer an optional in-app link for maximum fidelity.",
    ],
  },
  {
    title: "Use the newer proof and capability modules",
    blurb: "Phases, growth proof, credentials, capability cards and device screens.",
    steps: [
      "Add the module from the library or ask the agent for it by name.",
      "Numbered phases: add, remove and reorder phases and their tasks; each task carries its own icon and description.",
      "Growth proof split: up to twelve client logos with row, scale and spacing control, drag-to-place figures, per-figure number formatting, and separate ring/orbit styling for light and dark.",
      "Credential proof split: credentials sit in hairline orbit rings with no logo frames, two marks per credential for light and dark faces, and editable stat design.",
      "Capability cards and Device screen + benefits: swap photos (upload, link or team library), edit label bands, bullets and benefit tiles, and set image share, card look and columns.",
      "All of them export as editable PowerPoint objects.",
    ],
  },
];

const FAQS: Array<{ section: string; items: QA[] }> = [
  {
    section: "Getting started",
    items: [
      {
        q: "What is TransPerfect Element?",
        a: "A modular brand-production system for TransPerfect. One brief can generate a presentation deck, print assets, an event kit, and a social kit — every artifact assembles from the same governed modules, brand tokens, and knowledge context.",
      },
      {
        q: "Who can access the app?",
        a: "Anyone with a TransPerfect email can sign up. Admin privileges are granted automatically for @transperfect.com addresses on first confirmed sign-in.",
      },
      {
        q: "How is the navigation organised?",
        a: "An Elements menu in the header holds the four production surfaces — Presentation, Print, Event, and Social — each with its own sub-options. Brief, Knowledge, Agent, and Admin sit alongside it. All surfaces share the same brief, brand modes, style packs, and knowledge base. On phones the same tree lives in the hamburger sheet.",
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
        q: "Can I build a client proposal?",
        a: "Yes. Solution proposal is a first-class print template with division-specific content, a page thumbnail rail, an editable logo wall, a vector world map with drag-and-drop location pins, and a cost summary that recalculates totals from your inputs.",
      },
      {
        q: "Is there a library of print sections?",
        a: "Yes — Print → Modules. Every section module can be inserted into any asset with its copy normalized so all fields stay editable, and the hero auto-fit engine keeps pages balanced.",
      },
      {
        q: "How is print colour handled?",
        a: "Print targets offset and digital/POD. Brand RGB is never auto-converted — each brand has approved CMYK/spot builds, body text is always 100K, and a PDF/X-4 preflight gate checks bleed, crop, and safe geometry before output.",
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
    section: "Style packs & the Element skin",
    items: [
      {
        q: "What is a style pack?",
        a: "An approved visual system — palette, type scale, card geometry, and background motif — applied across a whole deck or print asset. There are 30 packs, S01–S30, and their S-codes never change, so a deck built on a pack keeps the same look forever.",
      },
      {
        q: "What is the Element System skin?",
        a: "S29 (light) and S30 (dark) are the Element product skins: vibrant Element colors, the five-brick Element logo, and authored Element background plates. Use them for Element platform marketing — they never show the TransPerfect wordmark.",
      },
      {
        q: "Do style packs and industry backgrounds interact?",
        a: "No. The style pack and the industry design recipe are independent, so you can switch the pack without losing the industry background family, and vice versa.",
      },
      {
        q: "How do I pick the right pack?",
        a: "Open Template Studio to compare packs on real slides, or let the intent recommender rank them from your brief — it returns three recommendations plus three alternates with the reason for each.",
      },
    ],
  },
  {
    section: "Agent chat",
    items: [
      {
        q: "What can the presentation agent do?",
        a: "Open Agent from the Elements menu and describe what you need. It proposes an outline, picks a style pack and section templates, writes the slides, and populates charts and stats — then hands you an editable deck.",
      },
      {
        q: "Can I control the agent's design choices?",
        a: "Yes. You can import a visual knowledge map as the design authority for a thread, or set per-thread overrides for palette, box layout, backdrop, and light/dark mode. Overrides outrank both the imported map and the skin catalog.",
      },
    ],
  },
  {
    section: "Studios & canvas editing",
    items: [
      {
        q: "When should I use Open Canvas Studio instead of a module?",
        a: "Use modules for anything repeatable. Use Open Canvas Studio (Admin → Brand assets) when a layout is genuinely one-off: free placement with snapping, guides, z-order, and AI Refit, exporting as editable PPTX shapes.",
      },
      {
        q: "What is Module Studio for?",
        a: "Authoring new governed modules. Compose a layout, map each element to a schema field, verify it across light/dark and multiple style packs, then publish it to the library for decks, print, and social.",
      },
      {
        q: "Does editing ever resize the rest of my slide?",
        a: "No. Stage scaling is unified across every editor mode and covered by an automated regression suite, so geometry, typography, and position stay identical between edit, preview, and export.",
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
        q: "Are exported PowerPoints editable?",
        a: "Yes. Decks and solution proposals export layered and editable — text frames, images, surfaces, icons, and backgrounds arrive as real PowerPoint objects with fonts mapped and corner radii preserved, not flattened pictures.",
      },
      {
        q: "How do I know the export will match the preview?",
        a: "Use the certified PowerPoint view in the editor: it renders through the export pipeline at true 1:1 scale, and the Layers inspector lists every object the file will contain.",
      },
      {
        q: "Do slide transitions survive export?",
        a: "Yes. Transitions set in the editor are written as native PowerPoint transitions, and on-screen playback respects reduced-motion settings.",
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
        a: "Overview (command center, Template Studio, team templates, print library, campaigns, audit log), Analytics (master analytics, deck engagement, AI usage & cost, imagery analytics, style-learning governance), Knowledge (hub, entries, Ask Oracle, Oracle KB, KB manager, approvals), Brand assets (assets, brand guides, LogoHub, Icon Studio, Open Canvas Studio, Module Studio, module editor, PDF ingestion, imagery), Translation (GlobalLink translate & share), and Governance (users & roles, team workspace).",
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
  {
    section: "NEXT London & live print jobs",
    items: [
      {
        q: "What is the NEXT London kit?",
        a: "The live print job for NEXT 2026 at the QEII Centre in London, 24–25 September 2026 — 54+ scenic panels plus step-and-repeat walls, door vinyls, pillars, booth artwork, badges, agendas and floor maps. Event → NEXT → London is the hub.",
      },
      {
        q: "Which version of the artwork am I looking at?",
        a: "Always the revision in force — the newest published revision, or the originally issued venue pack if nothing has been published yet. Vendors visiting the page without signing in see exactly the same thing.",
      },
      {
        q: "How do revisions work?",
        a: "Revisions are append-only. Each one snapshots panels, changes, placements, board sizes and step-and-repeat recipes, so nothing is overwritten and a removed panel stays removed. Publishing pushes the change live to open pages instantly.",
      },
      {
        q: "Why are file names prefixed with r012 or rdraft?",
        a: "Files are stamped with the revision they came from. Unpublished work is labelled rdraft- so a revision number is never printed on a file before that revision exists.",
      },
      {
        q: "Do printers need our fonts?",
        a: "No. Headlines, captions and wall copy in the print masters are outlined vector paths, not live text, so nothing can substitute a typeface. If the signage face can't be loaded the builder refuses to produce a master rather than silently substituting.",
      },
      {
        q: "Can I move and resize the copy on a panel?",
        a: "Yes. The live panel editor lets you reposition and resize headline, caption and QR blocks, with the changes clamped to the safe area and saved into the revision.",
      },
      {
        q: "Is every download checked?",
        a: "Yes. Every .svg, .ai and .png passes the signage QA gate before it is written — no download path bypasses it — and a failure is shown to you rather than quietly ignored.",
      },
      {
        q: "Can I get CMYK signage files?",
        a: "Not currently. RGB is the house colour space and CMYK output is switched off until every colour stop has an approved press build. We never silently convert brand RGB to CMYK.",
      },
      {
        q: "Which files are press masters and which are proofs?",
        a: "Panel SVG and .ai files are vector masters. Anything rasterised from the screen — badges, production studio images, social kit renders — is a proof and is labelled as one.",
      },
      {
        q: "Can attendees use the floor maps?",
        a: "Yes. Turn on rooms-only and the maps show room keys and areas without any signage marks or asset legend — that's the attendee-facing version. Maps cover seven floors and export as PDF, SVG, CSV or a ZIP of the set.",
      },
      {
        q: "Where do event dates, venue and links come from?",
        a: "One place only. Event facts and the printed URLs and QR targets are defined centrally, so a change flows to every panel, badge, agenda and directory at once.",
      },
    ],
  },
  {
    section: "Connector (ChatGPT & MCP)",
    items: [
      {
        q: "Can I use Element from ChatGPT?",
        a: "Yes. Add the Element connector pointing at the app's /mcp endpoint and sign in. It exposes the taxonomy, knowledge, deck building and export as tools.",
      },
      {
        q: "Is the deck it gives me finished?",
        a: "Yes. The download link is a complete, layered, editable PowerPoint file — it is the deliverable, not a partial preview, and the connector is instructed never to send you back into the app to finish it.",
      },
      {
        q: "So why does it sometimes offer an app link too?",
        a: "Only when more than a third of the slides use heavy design plates that render richer in the app. It's an optional extra after your download, never a replacement for it.",
      },
      {
        q: "How does it choose modules?",
        a: "It prefers module variants with a native PowerPoint renderer and flags each planned slide for whether it exports pixel-true, so the file you download matches what the app would render.",
      },
    ],
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ · TransPerfect Element" },
      {
        name: "description",
        content:
          "Frequently asked questions about TransPerfect Element: master briefs, presentation decks, print studio, event and social kits, translation, knowledge, and admin.",
      },
      { property: "og:title", content: "FAQ · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Frequently asked questions about TransPerfect Element: master briefs, presentation decks, print studio, event and social kits, translation, knowledge, and admin.",
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
      <header className="full-bleed relative hero-flush mb-10 overflow-hidden border-b border-black/5 bg-gradient-to-br from-[#003FC70a] via-white/70 to-[#C2A3FF22] py-9 lg:py-12">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.3em] text-black/50">Support</div>
              <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">
                Frequently asked questions
              </h1>
              <p className="mt-3 max-w-2xl text-black/60">
                Answers about master briefs, presentation decks, print studio, event & social kits,
                translation, knowledge, and administration. Can't find what you need?{" "}
                <Link to="/knowledge" className="font-medium text-[#003FC7] hover:underline">
                  Browse the knowledge base
                </Link>
                .
              </p>
            </div>
            <Link
              to="/about"
              className="rounded-full border border-black/15 bg-white/70 px-4 py-2.5 text-sm text-black/70 hover:border-black/40"
            >
              About the platform →
            </Link>
          </div>
        </div>
      </header>

      <div className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[#003FC7]">
            Step-by-step basics
          </h2>
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
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[#003FC7]">
          Common questions
        </h2>
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
