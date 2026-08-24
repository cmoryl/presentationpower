// Role-based dashboard personas.
//
// The database enum `app_role` is finer grained than the three working
// audiences the dashboard serves, so we fold roles into personas here. The
// mapping is an affordance only — every admin route and server function still
// re-checks `has_role(auth.uid(), 'admin')` server-side.

export type PersonaId = "admin" | "marketing" | "sales";

export type PersonaStep = {
  title: string;
  body: string;
  to: string;
  search?: Record<string, string>;
  cta: string;
};

export type PersonaShortcut = {
  label: string;
  hint: string;
  to: string;
  search?: Record<string, string>;
};

export type PersonaAction = {
  label: string;
  hint: string;
  to: string;
  search?: Record<string, string>;
};

export type WorkKind = "decks" | "print" | "kits";

export type Persona = {
  id: PersonaId;
  label: string;
  tagline: string;
  /** Roles that land on this persona by default, most specific first. */
  roles: readonly string[];
  /** The one thing this audience most often comes here to do. */
  primary: PersonaAction;
  /** The obvious alternative route to the same outcome. */
  secondary: PersonaAction;
  steps: readonly PersonaStep[];
  shortcuts: readonly PersonaShortcut[];
  /** Which live work counters matter to this audience. */
  counters: readonly WorkKind[];
  /** Which kinds of recent work to surface, in priority order. */
  resume: readonly WorkKind[];
  /** Short "how do I…" pointers into the guides. */
  guides: readonly PersonaAction[];
};


export const PERSONAS: readonly Persona[] = [
  {
    id: "admin",
    label: "Admin & design",
    tagline: "Own the system: templates, modules, brand assets and the guardrails everyone else inherits.",
    roles: ["admin", "brand_reviewer"],
    counters: ["decks", "print", "kits"],
    resume: ["decks", "print", "kits"],
    primary: {
      label: "Open the command center",
      hint: "Usage, approvals and anything the audit log flagged",
      to: "/admin",
    },
    secondary: {
      label: "Template Studio",
      hint: "Tune a look and publish it to every picker",
      to: "/admin/templates",
    },
    guides: [
      { label: "Publishing a template", hint: "Step-by-step", to: "/about" },
      { label: "Module authoring rules", hint: "Geometry + spacing", to: "/library/print/modules" },
      { label: "Export contract", hint: "PPTX, PDF, CMYK", to: "/faq" },
    ],

    steps: [
      {
        title: "Check the command center",
        body: "Usage, approvals waiting on you, and anything the audit log flagged since your last visit.",
        to: "/admin",
        cta: "Open command center",
      },
      {
        title: "Publish or tune a template",
        body: "Set the palette, type and surface, run the readiness suite, then publish so every picker can use it.",
        to: "/admin/templates",
        cta: "Template Studio",
      },
      {
        title: "Curate modules",
        body: "Build and review slide and print section modules so teams assemble from approved geometry only.",
        to: "/admin/module-studio",
        cta: "Module Studio",
      },
      {
        title: "Verify exports",
        body: "Run the export audit to confirm PowerPoint, PDF and image output still opens clean before a big push.",
        to: "/admin/export-audit",
        cta: "Export audit",
      },
    ],
    shortcuts: [
      { label: "Approvals", hint: "Sign off pending content", to: "/admin/approvals" },
      { label: "Brand assets", hint: "Logos, marks, imagery", to: "/admin/brand-assets" },
      { label: "LogoHub", hint: "Client logo repository", to: "/admin/logohub" },
      { label: "Knowledge hub", hint: "Grounding for every agent", to: "/admin/knowledge-hub" },
      { label: "Users & roles", hint: "Who can do what", to: "/admin/users" },
      { label: "Audit log", hint: "Every change, attributed", to: "/admin/audit" },
      { label: "Canvas creator", hint: "Free-form slide authoring", to: "/admin/canvas" },
      { label: "Alternate looks", hint: "Compare style packs", to: "/looks" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    tagline: "Run campaigns end to end: social, events, print collateral and the look that ties them together.",
    roles: ["brand_lead", "content_owner", "editor"],
    counters: ["kits", "print", "decks"],
    resume: ["kits", "print", "decks"],
    primary: {
      label: "Start a campaign brief",
      hint: "One brief, then every asset inherits the look",
      to: "/brief/new",
    },
    secondary: {
      label: "Talk to the social agent",
      hint: "Lay out every format in one pass",
      to: "/social-agent",
    },
    guides: [
      { label: "Campaign look memory", hint: "Keeping a set cohesive", to: "/about" },
      { label: "Print CMYK contract", hint: "What ships to press", to: "/faq" },
      { label: "Brand guides", hint: "Palettes and rules", to: "/knowledge/brand-guides" },
    ],

    steps: [
      {
        title: "Brief the campaign",
        body: "Name the audience, division and objective once — every asset you generate afterwards inherits it.",
        to: "/brief/new",
        cta: "Start a brief",
      },
      {
        title: "Build the social set",
        body: "Let the social agent lay out every format, then adjust crops and copy in the studio.",
        to: "/social-agent",
        cta: "Social agent",
      },
      {
        title: "Add event collateral",
        body: "Booth panels, badges and signage drawn from the same campaign look.",
        to: "/events-agent",
        cta: "Events agent",
      },
      {
        title: "Produce the print piece",
        body: "Case study, spotlight or e-brochure — fully editable, print-ready, on the CMYK contract.",
        to: "/print-agent",
        cta: "Print agent",
      },
    ],
    shortcuts: [
      { label: "Campaign kits", hint: "Saved multi-channel sets", to: "/social/presets" },
      { label: "Social assets", hint: "All formats", to: "/social" },
      { label: "Event assets", hint: "Booth, badge, signage", to: "/events" },
      { label: "Print templates", hint: "Curated library", to: "/library/print" },
      { label: "Brand guides", hint: "Rules and palettes", to: "/knowledge/brand-guides" },
      { label: "Imagery", hint: "Approved photography", to: "/imagery" },
      { label: "Alternate looks", hint: "Re-skin a campaign", to: "/looks" },
      { label: "Ask Oracle", hint: "Grounded brand answers", to: "/knowledge/ask" },
    ],
  },
  {
    id: "sales",
    label: "Sales enablement",
    tagline: "Get a client-ready, on-brand deck or one-pager out the door in minutes.",
    roles: ["sales", "viewer"],
    counters: ["decks", "print"],
    resume: ["decks", "print"],
    primary: {
      label: "Build a deck with the agent",
      hint: "Describe the meeting, get an outline and a built deck",
      to: "/agent",
    },
    secondary: {
      label: "Start from a brief",
      hint: "Prospect, division, one objective",
      to: "/brief/new",
    },
    guides: [
      { label: "Deck agent walkthrough", hint: "From chat to export", to: "/about" },
      { label: "Sharing a deck", hint: "Read-only links + locales", to: "/faq" },
      { label: "Ask Oracle", hint: "Facts you can cite", to: "/knowledge/ask" },
    ],

    steps: [
      {
        title: "Describe the meeting",
        body: "Prospect, division and one objective. The strategist plans the narrative for you.",
        to: "/brief/new",
        cta: "New brief",
      },
      {
        title: "Or just ask the deck agent",
        body: "Talk it through in chat and get a full outline plus a built deck you can edit.",
        to: "/agent",
        cta: "Deck agent",
      },
      {
        title: "Polish and check",
        body: "Swap modules, drop in client logos, and let the completeness gate catch empty fields.",
        to: "/decks",
        cta: "My decks",
      },
      {
        title: "Send it",
        body: "Export editable PowerPoint or PDF, or share a read-only link with a locale switcher.",
        to: "/files",
        cta: "My files",
      },
    ],
    shortcuts: [
      { label: "Solution proposal", hint: "Division-specific master", to: "/library/print", search: { type: "proposal" } },
      { label: "Case studies", hint: "Proof for the deal", to: "/library/print", search: { type: "case-study" } },
      { label: "Client spotlights", hint: "One-page wins", to: "/library/print", search: { type: "spotlight" } },
      { label: "Slide modules", hint: "Browse the library", to: "/library" },
      { label: "Import a deck", hint: "Bring in a client file", to: "/decks/import" },
      { label: "Ask Oracle", hint: "Facts you can cite", to: "/knowledge/ask" },
    ],
  },
];

export function personaById(id: PersonaId): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[2];
}

/** Default persona for a set of `user_roles` rows. */
export function personaForRoles(roles: readonly string[]): PersonaId {
  if (roles.includes("admin") || roles.includes("brand_reviewer")) return "admin";
  if (roles.includes("brand_lead") || roles.includes("content_owner") || roles.includes("editor"))
    return "marketing";
  return "sales";
}

export const PERSONA_STORAGE_KEY = "tpm.dashboardPersona";

export function isPersonaId(value: unknown): value is PersonaId {
  return value === "admin" || value === "marketing" || value === "sales";
}
