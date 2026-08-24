// Role marketing pages — the "why this workspace exists" story for each persona.
//
// The dashboards (src/routes/dashboard.tsx) are the working surfaces. These
// pages are the advertising surfaces that sit in front of them: a full hero,
// proof numbers, feature grid, workflow film-strip, objections/FAQ and a close.
// Copy lives here so the layout component stays purely presentational.

import type { PersonaId } from "./workspace-persona";

export type RoleStat = {
  value: string;
  unit?: string;
  label: string;
  foot: string;
};

export type RoleFeature = {
  title: string;
  body: string;
  tag: string;
};

export type RoleStep = {
  title: string;
  body: string;
};

export type RoleFaq = {
  q: string;
  a: string;
};

export type RoleCta = {
  label: string;
  to: string;
};

export type RoleMarketing = {
  id: PersonaId;
  /** Short nav/label form. */
  nav: string;
  eyebrow: string;
  /** Split headline — line two carries the accent wash. */
  headline: [string, string];
  sub: string;
  primary: RoleCta;
  secondary: RoleCta;
  /** Hero plate: which homepage motion clip fits the role. */
  plate: "presentation" | "print" | "event" | "social";
  /** Five brick captions for the Element motif under the hero. */
  bricks: readonly [string, string, string, string, string];
  stats: readonly RoleStat[];
  featureKicker: string;
  featureTitle: string;
  features: readonly RoleFeature[];
  workflowTitle: string;
  steps: readonly RoleStep[];
  quote: { text: string; who: string };
  faqTitle: string;
  faqs: readonly RoleFaq[];
  closeTitle: string;
  closeBody: string;
  seoTitle: string;
  seoDescription: string;
};

export const ROLE_MARKETING: Record<PersonaId, RoleMarketing> = {
  admin: {
    id: "admin",
    nav: "For admins & design",
    eyebrow: "Element for Admin & Design",
    headline: ["Set the system once.", "Every asset inherits it."],
    sub: "Templates, modules, colour, type, imagery and export contracts live in one governed place. Publish a change here and the next deck, brochure, booth panel and social post picks it up — no chase, no rogue files, no off-brand surprises.",
    primary: { label: "Open the command center", to: "/admin" },
    secondary: { label: "Tour Template Studio", to: "/admin/templates" },
    plate: "presentation",
    bricks: ["Templates", "Modules", "Imagery", "Guardrails", "Exports"],
    stats: [
      {
        value: "29",
        label: "Approved style packs",
        foot: "Locked S-codes, never renumbered",
      },
      { value: "189", unit: "+", label: "Governed modules", foot: "Slide + print section geometry" },
      { value: "100", unit: "%", label: "Exports byte-verified", foot: "PPTX, PDF and image sets" },
      { value: "1", unit: " source", label: "Of brand truth", foot: "Guides, logos, colour, type" },
    ],
    featureKicker: "Control surface",
    featureTitle: "Everything downstream, governed from one room",
    features: [
      {
        tag: "Templates",
        title: "Publish a look, not a file",
        body: "Set palette, type, surface and background art, run the readiness suite, then publish. Every picker across presentation, print, social and events sees it instantly.",
      },
      {
        tag: "Modules",
        title: "Authoring rules that hold",
        body: "Slide and print section modules ship with fixed geometry, spacing rhythm and fill behaviour, so anything assembled from them lands on-grid the first time.",
      },
      {
        tag: "Guardrails",
        title: "Contrast and completeness gates",
        body: "Colour contrast audits, empty-field blockers and pack/recipe validation stop off-brand work before it reaches an export, not after a client sees it.",
      },
      {
        tag: "Approvals",
        title: "Reviewer lanes with an audit trail",
        body: "Assign brand, marketing and legal reviewers per item. Every decision, comment and state change is timestamped on the asset forever.",
      },
      {
        tag: "Imagery",
        title: "Photoreal plate library",
        body: "Thirty industry kits of authored background art, tuned for ink density so module overlays stay legible on every scene.",
      },
      {
        tag: "Exports",
        title: "A contract, not a hope",
        body: "Layered editable PowerPoint, PDF/X-4 print files and verified image sets — checked byte-level in the export audit before anyone ships.",
      },
    ],
    workflowTitle: "How admins run it",
    steps: [
      {
        title: "Define the look",
        body: "Style pack, industry recipe, background art and typography floors set in Template Studio.",
      },
      {
        title: "Curate the modules",
        body: "Approve slide and print sections so teams only assemble from geometry you signed off.",
      },
      {
        title: "Set the gates",
        body: "Reviewer lanes, contrast thresholds and export rules decide what can leave the building.",
      },
      {
        title: "Watch the signal",
        body: "Usage, approval bottlenecks and the audit log tell you what to fix next — with names attached.",
      },
    ],
    quote: {
      text: "The brand stops being a PDF nobody opens and becomes the thing the software physically cannot break.",
      who: "Design systems lead",
    },
    faqTitle: "Admin questions",
    faqs: [
      {
        q: "Can I change a template without breaking existing work?",
        a: "Yes. Published looks are versioned and validated against the pack/recipe pairing rules. Existing assets keep the look they were built with until you re-apply the new one, and the readiness suite tells you what would shift before you publish.",
      },
      {
        q: "Who can publish templates and modules?",
        a: "Only users holding the admin role, checked server-side on every write. Role membership is stored separately from profiles, so nobody can grant themselves publishing rights from the client.",
      },
      {
        q: "What happens to off-brand assets already in flight?",
        a: "They surface in the Needs-attention queue on your dashboard with the specific failure — contrast, missing logo, empty field or mismatched pack — and can be blocked from export until cleared.",
      },
      {
        q: "Do exports really open cleanly in PowerPoint?",
        a: "Every export is layered and editable — real text frames, real shapes, embedded fonts and native slide transitions — and the export audit opens and verifies the bytes of each file type before it is offered for download.",
      },
      {
        q: "Can divisions have their own look?",
        a: "Yes. Sub-brands and divisions carry their own logo lockups, palettes and proposal masters while still inheriting the master rules for spacing, type and print output.",
      },
    ],
    closeTitle: "Own the system, not the cleanup",
    closeBody:
      "Set the guardrails once and spend your week on design work instead of policing decks.",
    seoTitle: "Element for Admin & Design — govern the whole brand system",
    seoDescription:
      "Publish templates, curate modules, set brand guardrails and verify every export from one governed control surface in TransPerfect Element.",
  },

  marketing: {
    id: "marketing",
    nav: "For marketing",
    eyebrow: "Element for Marketing",
    headline: ["One brief in.", "A whole campaign out."],
    sub: "Name the audience, division and objective once. Element produces the deck, the print piece, the social set and the event collateral from a single look — on brand, print-ready and editable down to the last caption.",
    primary: { label: "Start a campaign brief", to: "/brief/new" },
    secondary: { label: "Talk to the social agent", to: "/agent" },
    plate: "social",
    bricks: ["Brief", "Social", "Print", "Events", "Approve"],
    stats: [
      { value: "4", unit: " channels", label: "From one brief", foot: "Deck, print, social, events" },
      { value: "406", unit: "+", label: "Format renders swept", foot: "Every aspect ratio, every style" },
      { value: "10", unit: "×", label: "Faster campaign kits", foot: "Versus assembling by hand" },
      { value: "0", label: "Off-brand exports", foot: "Blocked at the approval gate" },
    ],
    featureKicker: "Campaign engine",
    featureTitle: "Everything a launch needs, cut from the same look",
    features: [
      {
        tag: "Campaign kits",
        title: "Every geometry, one click",
        body: "Feed, portrait, story, LinkedIn link and banner sets render together from the campaign look, cropped correctly with corner and safe-area maths handled.",
      },
      {
        tag: "Look memory",
        title: "Cohesion across every asset",
        body: "The campaign look remembers palette, imagery treatment and typography, so the booth panel and the story frame read as one campaign — not four freelancers.",
      },
      {
        tag: "Agents",
        title: "A specialist per surface",
        body: "Deck, print, social and events agents each know their format's rules and your brief, and hand back editable work rather than a wall of suggestions.",
      },
      {
        tag: "Print",
        title: "Press-ready, not print-ish",
        body: "e-Brochures, case studies and spotlights come out on the CMYK contract — 100K body text, correct bleed, crop and safe geometry, PDF/X-4 verified.",
      },
      {
        tag: "Imagery",
        title: "Photoreal, on-industry",
        body: "Thirty industry plate kits plus your own uploads, auto-fitted and calmed behind modules so type always stays readable.",
      },
      {
        tag: "Approvals",
        title: "Route it, don't chase it",
        body: "Send a whole kit for brand review, collect comments in one thread, and get notified the moment it is approved or sent back.",
      },
    ],
    workflowTitle: "How marketing runs it",
    steps: [
      {
        title: "Brief it once",
        body: "Audience, division and objective. Everything downstream inherits that context.",
      },
      {
        title: "Generate the set",
        body: "Social geometries, print pieces and the campaign deck are produced from one look.",
      },
      {
        title: "Refine in the studio",
        body: "Swap modules, adjust crops, drop in imagery — with snapping, undo and dirty-exit guards.",
      },
      {
        title: "Route and ship",
        body: "Brand review, approval trail, then export to PPTX, print PDF and verified image sets.",
      },
    ],
    quote: {
      text: "A launch used to be six briefs and three agencies. Now it's one brief and an afternoon of refinement.",
      who: "Campaign director",
    },
    faqTitle: "Marketing questions",
    faqs: [
      {
        q: "Can I edit everything the agent produces?",
        a: "Yes — every generated asset opens in a full editor with module swapping, drag-and-drop imagery, snapping and typography controls. Nothing is a flattened image you have to accept.",
      },
      {
        q: "Will the social set match the printed piece?",
        a: "That is the point of campaign look memory. Palette, imagery treatment, typography and motif carry across every surface generated from the same brief.",
      },
      {
        q: "What about division-specific branding?",
        a: "Pick the division on the brief and the correct logo lockup, palette and proposal master are applied automatically, including sub-brand rules for short names.",
      },
      {
        q: "How do approvals work?",
        a: "Send an asset or a whole kit into the approval queue, assign reviewer lanes, collect comments in-thread, and receive in-app notifications on approval or change requests. Exports stay gated until it clears.",
      },
      {
        q: "Can I use our own photography?",
        a: "Drop images straight onto any surface. The fit engine handles crop, aspect ratio and corner geometry, and the contrast audit tells you if type over the image needs a scrim.",
      },
    ],
    closeTitle: "Brief in the morning, campaign by lunch",
    closeBody:
      "Start with one brief and watch the deck, print piece and social set arrive already on brand.",
    seoTitle: "Element for Marketing — one brief, a full on-brand campaign",
    seoDescription:
      "Generate decks, print pieces, social sets and event collateral from a single campaign brief, all editable, brand-governed and export-ready.",
  },

  sales: {
    id: "sales",
    nav: "For sales",
    eyebrow: "Element for Sales Enablement",
    headline: ["Client-ready", "in minutes, not days."],
    sub: "Describe the meeting and get a real pitch deck — the right narrative, the right proof points, the client's logo, your division's look — editable in PowerPoint and already through brand review.",
    primary: { label: "Build a deck with the agent", to: "/agent" },
    secondary: { label: "Start from a brief", to: "/brief/new" },
    plate: "presentation",
    bricks: ["Describe", "Generate", "Refine", "Check", "Send"],
    stats: [
      { value: "5", unit: " min", label: "Brief to pitch deck", foot: "Versus a half-day rebuild" },
      { value: "12", unit: " slides", label: "Typical client narrative", foot: "Problem → solution → proof" },
      { value: "0", label: "Design tickets filed", foot: "No queue, no waiting" },
      { value: "100", unit: "%", label: "Brand-passing output", foot: "Gated before it leaves" },
    ],
    featureKicker: "Deal surface",
    featureTitle: "Everything a meeting needs, without a design queue",
    features: [
      {
        tag: "Deck agent",
        title: "Talk it through, get a deck",
        body: "Describe the prospect and objective in chat. The strategist plans the narrative, builds the slides and hands you a deck you can edit immediately.",
      },
      {
        tag: "Proof",
        title: "Stats that look designed",
        body: "Case studies, proof stats and client logos drop in from the approved pools — real clients, correct marks, never a placeholder rectangle.",
      },
      {
        tag: "Proposals",
        title: "Division-branded solution proposals",
        body: "Scope, locations map and live cost summary with automatic maths, fully editable, export as PDF or layered PowerPoint.",
      },
      {
        tag: "Leave-behinds",
        title: "The follow-up, already made",
        body: "Case study and client spotlight print pieces come out of the same look as the deck you just presented.",
      },
      {
        tag: "Confidence",
        title: "Completeness gate",
        body: "Empty fields, missing logos and low-contrast text are caught before you send, so nothing embarrassing reaches a prospect.",
      },
      {
        tag: "Share",
        title: "Present, export or link",
        body: "Present full-screen with smooth transitions, export editable PPTX and PDF, or share a read-only link with a locale switcher.",
      },
    ],
    workflowTitle: "How sales runs it",
    steps: [
      {
        title: "Describe the meeting",
        body: "Prospect, division and one objective — that is the whole input.",
      },
      { title: "Get the narrative", body: "A full outline plus a built deck in the approved look." },
      {
        title: "Swap in the specifics",
        body: "Client logo, their numbers, the modules that match the conversation.",
      },
      {
        title: "Send it",
        body: "Editable PowerPoint, a print leave-behind, or a shareable link — all brand-clean.",
      },
    ],
    quote: {
      text: "I stopped rebuilding last quarter's deck at midnight. I describe the meeting and refine what comes back.",
      who: "Enterprise account executive",
    },
    faqTitle: "Sales questions",
    faqs: [
      {
        q: "Do I need to know anything about design?",
        a: "No. Every layout is assembled from approved modules with fixed geometry and typography, so the deck is on brand before you touch it — and stays on brand while you edit.",
      },
      {
        q: "Can I use it offline in PowerPoint?",
        a: "Yes. Exports are layered and fully editable in PowerPoint — real text frames, shapes, embedded fonts and native transitions, not flattened pictures.",
      },
      {
        q: "Can I add the prospect's logo?",
        a: "Client logos come from LogoHub and drop into case study and proof slides with correct sizing and clear space. Client marks are used on client slides — never swapped for a TransPerfect mark.",
      },
      {
        q: "What if a slide is wrong for the meeting?",
        a: "Swap the module. Every slide can be replaced from the library, reordered by dragging, or re-fitted with AI if the new content is a different length.",
      },
      {
        q: "Does anything need approval before I send it?",
        a: "Standard pitch decks are ready to send. Anything your admins have gated — public-facing or regulated material — routes through the approval queue and you are notified the moment it clears.",
      },
    ],
    closeTitle: "Your next meeting deck is five minutes away",
    closeBody: "Describe the room you are walking into and let the agent build the rest.",
    seoTitle: "Element for Sales — client-ready pitch decks in minutes",
    seoDescription:
      "Describe a meeting and get an on-brand pitch deck, solution proposal and print leave-behind — editable in PowerPoint and already brand-checked.",
  },
};

export function roleMarketing(id: PersonaId): RoleMarketing {
  return ROLE_MARKETING[id] ?? ROLE_MARKETING.sales;
}
