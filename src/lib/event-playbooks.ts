// Event playbooks — industry-standard event archetypes with everything the
// user needs to spin up a full asset kit: brand, kit profile, timeline
// phases, deliverable checklist, KPI targets, sample EventFacts, and a
// seed variant so the demo page renders real preview assets, not lorem.
//
// Every playbook is a stable id ↔ scenario mapping so the /events/demo/$id
// route can render a live kit end-to-end without any AI or persistence.
// Adding a new playbook here surfaces automatically on /events.

import type { EventFacts } from "./campaigns";

export type PlaybookKind =
  | "launch"
  | "conference"
  | "summit"
  | "webinar"
  | "roundtable"
  | "briefing"
  | "roadshow"
  | "awards"
  | "trade-show"
  | "hackathon"
  | "field-day";

export type PlaybookPhase = {
  /** e.g. "T-30", "T-7", "Day of", "T+1", "T+14" */
  when: string;
  label: string;
  detail: string;
  /** Format ids from social-formats.ts that ship in this phase. */
  formats: string[];
};

export type CollateralCategory =
  | "Sponsorship"
  | "Wearables & Badges"
  | "Signage & Environment"
  | "Print & Collateral"
  | "Video & Motion"
  | "Digital & Web"
  | "Email & Direct"
  | "Merch & Swag";

export type PlaybookDeliverable = {
  surface: "digital" | "signage" | "print" | "video" | "email" | "wearable" | "merch";
  label: string;
  detail: string;
  /** Grouping for the collateral grid. Falls back to surface bucket. */
  category?: CollateralCategory;
  /** Production spec — dimensions, page count, print method. */
  spec?: string;
  /** Whether this piece is rendered live by the kit today. Absent = live. */
  status?: "live" | "coming-soon";
};

export type PlaybookKpi = {
  label: string;
  target: string;
  detail?: string;
};

export type EventPlaybook = {
  id: string;
  kind: PlaybookKind;
  name: string;
  tagline: string;
  /** Business-industry positioning line for cards / meta descriptions. */
  intent: string;
  /** BrandMode.id — controls palette and lockup on rendered assets. */
  subBrand: string;
  /** KitProfile.id from social-formats.ts. */
  kitProfileId: string;
  /** Variant id used as the seed source for demo renders. */
  seedVariantId: string;
  facts: EventFacts;
  phases: PlaybookPhase[];
  deliverables: PlaybookDeliverable[];
  kpis: PlaybookKpi[];
  /** Accent hex for card / hero background wash. */
  accent: string;
  /** One-word category chip label. */
  chip: string;
};

// ────────────────────────────────────────────────────────────────────────────
// The catalog. Ordered by descending industry demand — Launch and Conference
// lead because they anchor the majority of enterprise event spend.
// ────────────────────────────────────────────────────────────────────────────
export const EVENT_PLAYBOOKS: EventPlaybook[] = [
  {
    id: "product-launch",
    kind: "launch",
    name: "Product launch",
    tagline: "Announce, amplify, and convert on a single narrative.",
    intent:
      "Coordinated day-one moment: hero banner, LinkedIn drumbeat, story reel, email header, and press-ready callouts all sharing one headline and stat.",
    subBrand: "bm-tp-digital",
    kitProfileId: "event-kit",
    seedVariantId: "MV-INS-BIG-IDEA",
    accent: "#003FC7",
    chip: "Launch",
    facts: {
      name: "GlobalLink AI 2.0",
      subBrand: "bm-tp-digital",
      city: "Global · Digital",
      venue: "LinkedIn Live + on-demand",
      startDate: "2026-09-15",
      endDate: "2026-09-15",
      registrationUrl: "https://transperfect.com/launch",
      hashtag: "#GlobalLinkAI",
      speakers: [
        { name: "Phil Shawe", role: "CEO, TransPerfect" },
        { name: "Ana Ferreira", role: "SVP, GlobalLink" },
      ],
      sponsors: [],
      tone: "confident",
    },
    phases: [
      {
        when: "T-30",
        label: "Tease",
        detail: "Countdown story + eyebrow callout across LinkedIn.",
        formats: ["story-1080x1920", "square-1080", "callout-1200x628"],
      },
      {
        when: "T-7",
        label: "Prime",
        detail: "Registration push, exec preview posts, email header.",
        formats: ["portrait-1080x1350", "linkedin-link-1200x627", "email-header-1200x400"],
      },
      {
        when: "Day of",
        label: "Launch",
        detail: "Hero reveal, live-post loop, YouTube keynote card.",
        formats: [
          "callout-1200x628",
          "story-1080x1920",
          "youtube-1280x720",
          "linkedin-post-1200x1200",
        ],
      },
      {
        when: "T+1",
        label: "Echo",
        detail: "Recap thread, press callouts, thank-you sponsors.",
        formats: ["square-1080", "linkedin-link-1200x627", "email-header-1200x400"],
      },
    ],
    deliverables: [
      {
        surface: "digital",
        label: "Hero banner + microsite header",
        detail: "1200×628 + 1600×900 with a single stat callout.",
      },
      {
        surface: "digital",
        label: "LinkedIn drumbeat (4 posts)",
        detail: "Tease → prime → launch → echo, one narrative.",
      },
      {
        surface: "email",
        label: "Announcement email header",
        detail: "1200×400 with date, venue, single CTA.",
      },
      {
        surface: "video",
        label: "Story reel loop",
        detail: "1080×1920 · 9-second bumper with product beat.",
      },
      {
        surface: "print",
        label: "Executive one-pager",
        detail: "Press-ready case-study spread for briefings.",
      },
    ],
    kpis: [
      {
        label: "Impressions",
        target: "2.5M",
        detail: "Across LinkedIn + email in the first 72 hours.",
      },
      { label: "Registrations", target: "8k", detail: "Live + on-demand replay." },
      { label: "Pipeline signal", target: "$18M", detail: "MQLs sourced from launch UTM." },
    ],
  },
  {
    id: "flagship-conference",
    kind: "conference",
    name: "Flagship conference",
    tagline: "A multi-day summit that scales from signage to social.",
    intent:
      "Speaker cards, session badges, sponsorship rails, wayfinding, and a story-first content engine — one visual system across every venue surface.",
    subBrand: "bm-tp-master",
    kitProfileId: "full-launch",
    seedVariantId: "MV-CASE-METRICS",
    accent: "#0057FF",
    chip: "Summit",
    facts: {
      name: "TransPerfect Summit 2026",
      subBrand: "bm-tp-master",
      city: "New York, NY",
      venue: "Javits Center",
      startDate: "2026-10-14",
      endDate: "2026-10-16",
      registrationUrl: "https://transperfect.com/summit",
      hashtag: "#TPSummit26",
      speakers: [
        { name: "Elizabeth Elting", role: "Co-founder" },
        { name: "Phil Shawe", role: "CEO" },
        { name: "Dr. Aditi Rao", role: "CMO, Pfizer" },
        { name: "Yuki Tanaka", role: "Head of Localization, Sony" },
      ],
      sponsors: [
        { name: "Trial Interactive", tier: "title" },
        { name: "GlobalLink", tier: "gold" },
        { name: "MediaNext", tier: "silver" },
      ],
      tone: "authoritative",
    },
    phases: [
      {
        when: "T-60",
        label: "Save the date",
        detail: "Speaker teaser cards + agenda dropper.",
        formats: ["portrait-1080x1350", "linkedin-post-1200x1200"],
      },
      {
        when: "T-14",
        label: "Program reveal",
        detail: "Session tracks, sponsor rails, exec spotlight.",
        formats: ["callout-1200x628", "story-1080x1920", "linkedin-link-1200x627"],
      },
      {
        when: "Day of",
        label: "On-site",
        detail: "Wayfinding, badges, live-post templates.",
        formats: ["square-1080", "portrait-1080x1350", "story-1080x1920"],
      },
      {
        when: "T+7",
        label: "Recap",
        detail: "Highlights reel, sponsor thanks, replay push.",
        formats: ["email-header-1200x400", "linkedin-link-1200x627", "youtube-1280x720"],
      },
    ],
    deliverables: [
      {
        surface: "signage",
        label: "Stage backdrop + wayfinding",
        detail: "16:9 stage, 9:16 wayfinding towers, sponsor loop.",
      },
      {
        surface: "print",
        label: "Badges + lanyards",
        detail: "Attendee, speaker, sponsor variants.",
      },
      {
        surface: "digital",
        label: "Speaker card set",
        detail: "One card per session · 1080×1350 portrait.",
      },
      {
        surface: "digital",
        label: "Live-post loop",
        detail: "Session-ID templated square + story.",
      },
      { surface: "video", label: "Recap edit", detail: "60-second highlights + 15s teaser." },
    ],
    kpis: [
      { label: "In-person attendance", target: "3,500", detail: "Sold-out capacity target." },
      { label: "Digital attendance", target: "22k", detail: "Live stream + on-demand." },
      { label: "Sponsor NPS", target: "72", detail: "Post-event partner survey." },
    ],
  },
  {
    id: "life-sciences-summit",
    kind: "summit",
    name: "Life Sciences Summit",
    tagline: "Regulatory-safe kit for pharma and clinical audiences.",
    intent:
      "Trial Interactive branded scientific programming — poster grids, session cards, and a compliance-friendly template set that keeps every claim substantiated.",
    subBrand: "bm-tp-lifesci",
    kitProfileId: "event-kit",
    seedVariantId: "MV-PROOF-STATS-3",
    accent: "#4A90E2",
    chip: "Life Sciences",
    facts: {
      name: "TrialConnect 2026",
      subBrand: "bm-tp-lifesci",
      city: "Boston, MA",
      venue: "Seaport World Trade Center",
      startDate: "2026-11-04",
      endDate: "2026-11-06",
      registrationUrl: "https://trialinteractive.com/summit",
      hashtag: "#TrialConnect",
      speakers: [
        { name: "Dr. Marisol Vega", role: "Chief Medical Officer" },
        { name: "Prof. Chen Wei", role: "Regulatory Chair, EMA" },
      ],
      sponsors: [
        { name: "Trial Interactive", tier: "title" },
        { name: "Pfizer", tier: "gold" },
      ],
      tone: "authoritative",
    },
    phases: [
      {
        when: "T-90",
        label: "Abstract call",
        detail: "Poster submission signal + eligibility card.",
        formats: ["portrait-1080x1350", "email-header-1200x400"],
      },
      {
        when: "T-30",
        label: "Program",
        detail: "Track reveal · principal investigators.",
        formats: ["linkedin-post-1200x1200", "callout-1200x628"],
      },
      {
        when: "Day of",
        label: "Session",
        detail: "Session-ID cards, poster wayfinding.",
        formats: ["portrait-1080x1350", "story-1080x1920"],
      },
      {
        when: "T+14",
        label: "Publication",
        detail: "Peer-reviewed recap + citation cards.",
        formats: ["callout-1200x628", "linkedin-link-1200x627"],
      },
    ],
    deliverables: [
      {
        surface: "print",
        label: "Poster grid (A0)",
        detail: "48 posters · 33.1×46.8in Trial Interactive template.",
      },
      {
        surface: "signage",
        label: "Session boards",
        detail: "Track colored, ADA-compliant contrast.",
      },
      {
        surface: "digital",
        label: "Principal investigator cards",
        detail: "Portrait · citation slot preserved.",
      },
      {
        surface: "email",
        label: "Abstract-accepted email",
        detail: "1200×400 header + agenda link.",
      },
    ],
    kpis: [
      { label: "Abstracts submitted", target: "220" },
      { label: "CE credits issued", target: "1,800" },
      { label: "Peer citations · T+90", target: "48" },
    ],
  },
  {
    id: "legaltech-day",
    kind: "conference",
    name: "Legal-tech day",
    tagline: "Deep-navy palette for regulated GC audiences.",
    intent:
      "Discovery workshops, matter-management deep dives, GC roundtables — a corporate-dark visual system that reads confidential without going cold.",
    subBrand: "bm-tp-legal",
    kitProfileId: "email-set",
    seedVariantId: "MV-INS-QUOTE",
    accent: "#03002C",
    chip: "Legal",
    facts: {
      name: "GC Insight Day",
      subBrand: "bm-tp-legal",
      city: "London, UK",
      venue: "The Shard · Floor 32",
      startDate: "2026-10-08",
      registrationUrl: "https://transperfect.com/legal",
      hashtag: "#GCInsight",
      speakers: [
        { name: "Julian Wexford KC", role: "Managing Partner, Wexford Chambers" },
        { name: "Priya Menon", role: "General Counsel, HSBC" },
      ],
      sponsors: [],
      tone: "authoritative",
    },
    phases: [
      {
        when: "T-21",
        label: "Invitation",
        detail: "Confidential invite + agenda card.",
        formats: ["email-header-1200x400", "callout-1200x628"],
      },
      {
        when: "T-7",
        label: "Briefing",
        detail: "Pre-read summary + speaker list.",
        formats: ["linkedin-link-1200x627", "portrait-1080x1350"],
      },
      {
        when: "Day of",
        label: "Sessions",
        detail: "Roundtable session cards.",
        formats: ["square-1080", "callout-1200x628"],
      },
    ],
    deliverables: [
      {
        surface: "email",
        label: "Confidential invite",
        detail: "Password-gated · white-glove tone.",
      },
      {
        surface: "print",
        label: "Agenda dossier",
        detail: "A4 dark-navy dossier with GC-only sessions.",
      },
      {
        surface: "digital",
        label: "Chatham House card set",
        detail: "Non-attributable quote graphics.",
      },
    ],
    kpis: [
      { label: "GC-level attendance", target: "60", detail: "By-invite ceiling." },
      { label: "Post-event meetings", target: "18" },
    ],
  },
  {
    id: "webinar-roundtable",
    kind: "webinar",
    name: "Webinar & roundtable",
    tagline: "Low-lift kit for a 45-minute virtual moment.",
    intent:
      "Registration graphic, LinkedIn link card, speaker cards, callout post, and a follow-up recap header — five assets, one afternoon.",
    subBrand: "bm-tp-master",
    kitProfileId: "social-essentials",
    seedVariantId: "MV-INS-CALLOUT",
    accent: "#A1FBF9",
    chip: "Webinar",
    facts: {
      name: "AI in translation ops",
      subBrand: "bm-tp-master",
      city: "Virtual",
      venue: "Zoom Webinar",
      startDate: "2026-08-19",
      registrationUrl: "https://transperfect.com/ai-ops",
      hashtag: "#TPAIOps",
      speakers: [{ name: "Miriam Cho", role: "VP Product, GlobalLink" }],
      sponsors: [],
      tone: "curious",
    },
    phases: [
      {
        when: "T-14",
        label: "Register",
        detail: "LinkedIn link card + registration story.",
        formats: ["linkedin-link-1200x627", "story-1080x1920"],
      },
      {
        when: "T-1",
        label: "Reminder",
        detail: "Story countdown + email header.",
        formats: ["story-1080x1920", "email-header-1200x400"],
      },
      {
        when: "T+1",
        label: "Recap",
        detail: "Replay callout + key quote card.",
        formats: ["callout-1200x628", "square-1080"],
      },
    ],
    deliverables: [
      { surface: "digital", label: "Registration graphic", detail: "Square + link card + story." },
      { surface: "email", label: "Reminder header", detail: "1200×400 with countdown." },
      { surface: "digital", label: "Replay callout", detail: "1200×628 landscape with quote." },
    ],
    kpis: [
      { label: "Registrations", target: "1,200" },
      { label: "Live attendance", target: "45%" },
      { label: "Replay views · T+30", target: "3.5k" },
    ],
  },
  {
    id: "executive-briefing",
    kind: "briefing",
    name: "Executive briefing",
    tagline: "Confidential C-suite kit in corporate dark.",
    intent:
      "By-invite briefing centers on one exec sponsor — dossier, seat cards, and no-social discretion. Everything reads confidential without going austere.",
    subBrand: "bm-enterprise",
    kitProfileId: "email-set",
    seedVariantId: "MV-INS-SO-WHAT",
    accent: "#03002C",
    chip: "Executive",
    facts: {
      name: "Board briefing · Q4",
      subBrand: "bm-enterprise",
      city: "New York, NY",
      venue: "1250 Broadway · 32F",
      startDate: "2026-12-03",
      hashtag: "",
      speakers: [{ name: "Phil Shawe", role: "CEO" }],
      sponsors: [],
      tone: "authoritative",
      registrationUrl: "",
    },
    phases: [
      {
        when: "T-14",
        label: "Invite",
        detail: "White-glove confidential invitation.",
        formats: ["email-header-1200x400", "callout-1200x628"],
      },
      {
        when: "T-3",
        label: "Pre-read",
        detail: "Dossier delivery · overnight.",
        formats: ["linkedin-link-1200x627"],
      },
      {
        when: "Day of",
        label: "In-room",
        detail: "Seat cards, agenda, room screens.",
        formats: ["callout-1200x628"],
      },
    ],
    deliverables: [
      { surface: "print", label: "A4 dossier", detail: "Bound, embossed, dark-navy." },
      { surface: "print", label: "Seat cards", detail: "Named, letterpress." },
      { surface: "digital", label: "Room screen loop", detail: "16:9 dark palette." },
    ],
    kpis: [
      { label: "Attendance", target: "12", detail: "By-invite; no more, no fewer." },
      { label: "Follow-on meetings", target: "9" },
    ],
  },
  {
    id: "field-roadshow",
    kind: "roadshow",
    name: "Regional roadshow",
    tagline: "Five cities, one kit — swap city + venue, done.",
    intent:
      "A city-tour template that keeps hero and CTA constant while cycling city, date, and venue tokens. Every asset is city-templated so you never rebuild.",
    subBrand: "bm-tp-master",
    kitProfileId: "full-launch",
    seedVariantId: "MV-CTX-STAT-GRID",
    accent: "#FF9B70",
    chip: "Roadshow",
    facts: {
      name: "Localization on Tour",
      subBrand: "bm-tp-master",
      city: "5 cities",
      venue: "Sofitel · Grand Hyatt · The Peninsula",
      startDate: "2026-09-01",
      endDate: "2026-11-10",
      registrationUrl: "https://transperfect.com/tour",
      hashtag: "#TPOnTour",
      speakers: [
        { name: "Miriam Cho", role: "VP Product" },
        { name: "Diego Alvarez", role: "Regional Director, LATAM" },
      ],
      sponsors: [],
      tone: "warm",
    },
    phases: [
      {
        when: "T-30",
        label: "Tour reveal",
        detail: "Route map card + city stack.",
        formats: ["callout-1200x628", "linkedin-post-1200x1200"],
      },
      {
        when: "T-7 per city",
        label: "City prime",
        detail: "City-templated invites × 5.",
        formats: ["portrait-1080x1350", "email-header-1200x400"],
      },
      {
        when: "Day of each",
        label: "Live",
        detail: "Story + square with venue token.",
        formats: ["story-1080x1920", "square-1080"],
      },
      {
        when: "T+30",
        label: "Recap tour",
        detail: "Full-tour highlights + logo grid.",
        formats: ["youtube-1280x720", "linkedin-link-1200x627"],
      },
    ],
    deliverables: [
      { surface: "digital", label: "5× city invite set", detail: "City + date + venue tokens." },
      { surface: "signage", label: "Registration desk", detail: "Retractable + table runner." },
      { surface: "video", label: "Route sizzle", detail: "20-second animated map." },
    ],
    kpis: [
      { label: "Cities completed", target: "5/5" },
      { label: "Attendance per city", target: "180" },
      { label: "Local press hits", target: "12" },
    ],
  },
  {
    id: "industry-awards",
    kind: "awards",
    name: "Industry awards",
    tagline: "Celebrate winners on a fully editorial system.",
    intent:
      "Nomination call, shortlist reveal, and winner card set — every asset feels editorial and screen-first, ready for the gala loop.",
    subBrand: "bm-tp-media",
    kitProfileId: "full-launch",
    seedVariantId: "MV-INS-QUOTE",
    accent: "#EC388A",
    chip: "Awards",
    facts: {
      name: "Localization Impact Awards",
      subBrand: "bm-tp-media",
      city: "Los Angeles, CA",
      venue: "Fairmont Century Plaza",
      startDate: "2026-12-11",
      hashtag: "#LocImpact",
      registrationUrl: "https://transperfect.com/awards",
      speakers: [{ name: "Sofia Marín", role: "Emcee" }],
      sponsors: [
        { name: "MediaNext", tier: "title" },
        { name: "Sony", tier: "gold" },
      ],
      tone: "warm",
    },
    phases: [
      {
        when: "T-90",
        label: "Nominations",
        detail: "Nomination call + category set.",
        formats: ["portrait-1080x1350", "callout-1200x628"],
      },
      {
        when: "T-30",
        label: "Shortlist",
        detail: "Shortlisted nominee cards × N.",
        formats: ["square-1080", "linkedin-post-1200x1200"],
      },
      {
        when: "T-1",
        label: "Countdown",
        detail: "24-hour reveal story.",
        formats: ["story-1080x1920"],
      },
      {
        when: "T+1",
        label: "Winners",
        detail: "Winner cards + press headline.",
        formats: ["linkedin-link-1200x627", "email-header-1200x400", "youtube-1280x720"],
      },
    ],
    deliverables: [
      { surface: "signage", label: "Gala loop 16:9", detail: "Winner reveal animation." },
      { surface: "print", label: "Award certificates", detail: "A4 gold-foiled." },
      { surface: "digital", label: "Winner card set", detail: "One card per category." },
    ],
    kpis: [
      { label: "Category submissions", target: "480" },
      { label: "Gala attendance", target: "620" },
      { label: "Earned press · T+7", target: "22" },
    ],
  },
  // ────────── Expansion pack · trade shows, hackathons, field days ──────────
  {
    id: "trade-show-booth",
    kind: "trade-show",
    name: "Trade-show booth",
    tagline: "Booth-in-a-box for a headline industry expo.",
    intent:
      "Everything the booth needs — retractable banners, monitor loops, badge-scan follow-up email — with editorial signage that photographs well on a busy floor.",
    subBrand: "bm-tp-master",
    kitProfileId: "full-launch",
    seedVariantId: "MV-OP-COVER-POSTER",
    accent: "#003FC7",
    chip: "Trade show",
    facts: {
      name: "SaaStr Europa · TransPerfect Booth",
      subBrand: "bm-tp-master",
      city: "London, UK",
      venue: "ExCeL London · Booth E42",
      startDate: "2026-06-14",
      endDate: "2026-06-16",
      hashtag: "#SaaStrEuropa",
      registrationUrl: "https://transperfect.com/saastr",
      speakers: [{ name: "Marcus Chen", role: "VP Global Sales" }],
      sponsors: [],
      tone: "confident",
    },
    phases: [
      {
        when: "T-30",
        label: "Pre-show",
        detail: "Invite-to-booth email + LinkedIn post.",
        formats: ["email-header-1200x400", "linkedin-post-1200x1200"],
      },
      {
        when: "T-7",
        label: "Meeting requests",
        detail: "Speaker portrait + calendar link.",
        formats: ["portrait-1080x1350"],
      },
      {
        when: "Day of",
        label: "Live",
        detail: "Story updates + booth loop.",
        formats: ["story-1080x1920", "youtube-1280x720"],
      },
      {
        when: "T+1",
        label: "Follow-up",
        detail: "Badge-scan email + CTA.",
        formats: ["email-header-1200x400", "callout-1200x628"],
      },
    ],
    deliverables: [
      { surface: "signage", label: "Booth retractables", detail: "3× 33in editorial poster set." },
      { surface: "video", label: "Booth loop", detail: "16:9 muted 60-second reel." },
      { surface: "email", label: "Badge follow-up", detail: "1200×400 header + CTA." },
    ],
    kpis: [
      { label: "Booth badge scans", target: "1,200" },
      { label: "Booked meetings", target: "180" },
      { label: "SQLs · T+30", target: "48" },
    ],
  },
  {
    id: "hackathon",
    kind: "hackathon",
    name: "Developer hackathon",
    tagline: "48-hour hackathon kit — invite through demo-day.",
    intent:
      "Developer-first invite set, hourly leaderboard cards, and a demo-day recap. GlobalLink palette for community events, master palette for enterprise-hosted ones.",
    subBrand: "bm-tp-digital",
    kitProfileId: "full-launch",
    seedVariantId: "MV-ED-HERO-ORB",
    accent: "#A1FBF9",
    chip: "Hackathon",
    facts: {
      name: "GlobalLink Devathon 2026",
      subBrand: "bm-tp-digital",
      city: "Barcelona, ES",
      venue: "Cosmo Caixa · Hall A",
      startDate: "2026-10-24",
      endDate: "2026-10-26",
      hashtag: "#GLDevathon",
      registrationUrl: "https://transperfect.com/devathon",
      speakers: [
        { name: "Anika Rao", role: "Head of Developer Experience" },
        { name: "Rui Costa", role: "Principal Engineer" },
      ],
      sponsors: [{ name: "AWS", tier: "gold" }],
      tone: "warm",
    },
    phases: [
      {
        when: "T-45",
        label: "Devrel push",
        detail: "GitHub README + LinkedIn post.",
        formats: ["linkedin-post-1200x1200", "callout-1200x628"],
      },
      {
        when: "T-14",
        label: "Speaker + prize reveal",
        detail: "Portrait + wide reveal.",
        formats: ["portrait-1080x1350", "x-1600x900"],
      },
      {
        when: "Day of",
        label: "Live",
        detail: "Leaderboard cards + story updates.",
        formats: ["square-1080", "story-1080x1920"],
      },
      {
        when: "T+1",
        label: "Winners",
        detail: "Winner card + YouTube demo reel.",
        formats: ["linkedin-link-1200x627", "youtube-1280x720"],
      },
    ],
    deliverables: [
      { surface: "digital", label: "Devrel pack", detail: "GitHub README + LinkedIn." },
      { surface: "signage", label: "Leaderboard loop", detail: "16:9 hourly rankings." },
      { surface: "video", label: "Demo-day reel", detail: "3-minute recap." },
    ],
    kpis: [
      { label: "Registered teams", target: "180" },
      { label: "Submissions", target: "62" },
      { label: "Post-event API sign-ups", target: "2.4k" },
    ],
  },
  {
    id: "customer-summit",
    kind: "summit",
    name: "Annual customer summit",
    tagline: "Two-day customer-only summit — Life Sciences flavor by default.",
    intent:
      "Curated invite-only summit for the top 200 accounts — badge-forward signage, agenda emails, and a fully sponsored dinner set.",
    subBrand: "bm-tp-lifesci",
    kitProfileId: "full-launch",
    seedVariantId: "MV-OP-AGENDA",
    accent: "#A6FA87",
    chip: "Summit",
    facts: {
      name: "TransPerfect Life Sciences Summit",
      subBrand: "bm-tp-lifesci",
      city: "Boston, MA",
      venue: "Encore Boston Harbor",
      startDate: "2026-11-05",
      endDate: "2026-11-06",
      hashtag: "#TPLifeSciSummit",
      registrationUrl: "https://transperfect.com/lifesci-summit",
      speakers: [
        { name: "Dr. Elena Marín", role: "SVP Clinical Operations" },
        { name: "James Wu", role: "Chief Regulatory Officer" },
      ],
      sponsors: [{ name: "Trial Interactive", tier: "title" }],
      tone: "authoritative",
    },
    phases: [
      {
        when: "T-60",
        label: "Save-the-date",
        detail: "Invite email + portrait.",
        formats: ["email-header-1200x400", "portrait-1080x1350"],
      },
      {
        when: "T-14",
        label: "Agenda drop",
        detail: "Session cards + LinkedIn post.",
        formats: ["square-1080", "linkedin-post-1200x1200"],
      },
      {
        when: "Day of",
        label: "Live",
        detail: "Session-title 16:9 loops.",
        formats: ["youtube-1280x720", "story-1080x1920"],
      },
      {
        when: "T+7",
        label: "Recap",
        detail: "Highlights email + link card.",
        formats: ["email-header-1200x400", "linkedin-link-1200x627"],
      },
    ],
    deliverables: [
      { surface: "print", label: "Delegate badge + program", detail: "A6 badges + 24pp program." },
      { surface: "signage", label: "Session loops", detail: "16:9 per breakout." },
      { surface: "email", label: "Save-the-date + recap", detail: "2× 1200×400 headers." },
    ],
    kpis: [
      { label: "Confirmed attendees", target: "200" },
      { label: "NPS · onsite", target: "72" },
      { label: "Pipeline influenced · T+90", target: "$28M" },
    ],
  },
  {
    id: "field-day",
    kind: "field-day",
    name: "Sales field day",
    tagline: "Half-day, single-city seller huddle with prospect breakouts.",
    intent:
      "A tighter, sales-forward field day — three sessions, one dinner, three retargeting emails. Enterprise palette for CFO-flavored dinners.",
    subBrand: "bm-enterprise",
    kitProfileId: "email-set",
    seedVariantId: "MV-CTX-CARDS-3",
    accent: "#03002C",
    chip: "Field day",
    facts: {
      name: "TransPerfect Enterprise Field Day",
      subBrand: "bm-enterprise",
      city: "New York, NY",
      venue: "The Whitby Hotel · Orlov Room",
      startDate: "2026-04-22",
      hashtag: "#TPFieldDay",
      registrationUrl: "https://transperfect.com/fieldday",
      speakers: [{ name: "Robert Yeats", role: "President, Enterprise" }],
      sponsors: [],
      tone: "authoritative",
    },
    phases: [
      {
        when: "T-14",
        label: "Invite",
        detail: "Personal-note email + calendar hold.",
        formats: ["email-header-1200x400"],
      },
      {
        when: "T-3",
        label: "Agenda",
        detail: "Session card + attendee list.",
        formats: ["callout-1200x628"],
      },
      {
        when: "T+1",
        label: "Recap",
        detail: "Executive summary link card.",
        formats: ["linkedin-link-1200x627"],
      },
    ],
    deliverables: [
      { surface: "email", label: "Personal invite", detail: "1200×400 executive banner." },
      { surface: "print", label: "Menu + placecards", detail: "A5 dinner menus." },
      { surface: "digital", label: "Recap link", detail: "1200×627 exec summary." },
    ],
    kpis: [
      { label: "Confirmed attendees", target: "24" },
      { label: "Follow-up meetings", target: "18" },
      { label: "Pipeline · T+60", target: "$6.2M" },
    ],
  },
  {
    id: "legal-roundtable",
    kind: "roundtable",
    name: "Legal roundtable",
    tagline: "Chatham-house roundtable for GCs and cross-border partners.",
    intent:
      "Discretion-first invite kit — no logos on-screen, editorial portraits, and Chatham-house post-event write-up.",
    subBrand: "bm-tp-legal",
    kitProfileId: "email-set",
    seedVariantId: "MV-INS-QUOTE",
    accent: "#003FC7",
    chip: "Roundtable",
    facts: {
      name: "Cross-Border Discovery Roundtable",
      subBrand: "bm-tp-legal",
      city: "London, UK",
      venue: "The Ned · Boardroom 4",
      startDate: "2026-09-17",
      hashtag: "#TPRoundtable",
      registrationUrl: "https://transperfect.com/roundtable",
      speakers: [{ name: "Priya Menon", role: "SVP Legal Solutions" }],
      sponsors: [],
      tone: "authoritative",
    },
    phases: [
      {
        when: "T-30",
        label: "Private invite",
        detail: "Named-invite email.",
        formats: ["email-header-1200x400"],
      },
      {
        when: "T-3",
        label: "Discussion doc",
        detail: "PDF prompt kit + callout.",
        formats: ["callout-1200x628"],
      },
      {
        when: "T+7",
        label: "Chatham write-up",
        detail: "Anonymized link card.",
        formats: ["linkedin-link-1200x627"],
      },
    ],
    deliverables: [
      { surface: "email", label: "Named invite", detail: "1200×400 discreet header." },
      { surface: "print", label: "Discussion doc", detail: "A4 · 6-page prompt kit." },
      { surface: "digital", label: "Chatham summary", detail: "1200×627 anonymized." },
    ],
    kpis: [
      { label: "Confirmed GCs", target: "14" },
      { label: "Discussion-doc downloads", target: "620" },
      { label: "Post-event referrals · T+45", target: "9" },
    ],
  },
  {
    id: "gaming-launch-party",
    kind: "launch",
    name: "Gaming launch party",
    tagline: "Studio-and-community launch party for a triple-A title.",
    intent:
      "Neon-editorial launch — creator invites, on-site photo-loop signage, and a T+1 highlights reel for Twitch and YouTube.",
    subBrand: "bm-tp-games",
    kitProfileId: "full-launch",
    seedVariantId: "MV-ED-HERO-BLEED",
    accent: "#EC388A",
    chip: "Launch party",
    facts: {
      name: "TransPerfect Gaming · Launch Party",
      subBrand: "bm-tp-games",
      city: "Los Angeles, CA",
      venue: "NeueHouse Hollywood",
      startDate: "2026-08-08",
      hashtag: "#TPGamingLive",
      registrationUrl: "https://transperfect.com/gaming-live",
      speakers: [{ name: "Kai Nakamura", role: "SVP Gaming" }],
      sponsors: [{ name: "Twitch", tier: "gold" }],
      tone: "warm",
    },
    phases: [
      {
        when: "T-21",
        label: "Creator invite",
        detail: "Portrait + story pack.",
        formats: ["portrait-1080x1350", "story-1080x1920"],
      },
      {
        when: "T-7",
        label: "Reveal",
        detail: "Wide teaser + YouTube thumb.",
        formats: ["x-1600x900", "youtube-1280x720"],
      },
      {
        when: "Day of",
        label: "Live",
        detail: "Photo-loop signage.",
        formats: ["square-1080", "story-1080x1920"],
      },
      {
        when: "T+1",
        label: "Highlights reel",
        detail: "1200×627 link + YouTube thumb.",
        formats: ["linkedin-link-1200x627", "youtube-1280x720"],
      },
    ],
    deliverables: [
      { surface: "signage", label: "Photo-loop wall", detail: "16:9 vertical + horizontal." },
      { surface: "video", label: "Highlights reel", detail: "90-second recap." },
      { surface: "digital", label: "Creator pack", detail: "Portrait + story per creator." },
    ],
    kpis: [
      { label: "Creator attendance", target: "80" },
      { label: "Livestream peak concurrents", target: "42k" },
      { label: "Earned press · T+7", target: "24" },
    ],
  },
  {
    id: "next-flagship-london",
    kind: "conference",
    name: "TransPerfect NEXT · London flagship",
    tagline: "The new production ecosystem — eleven divisions, one stage.",
    intent:
      "Two-day flagship at the QEII Centre. Every division ships the same 56-format system with only its accent, lockup and headline suffix swapped — social drumbeat, speaker cards, advocacy squares, signage, screens, pillars, sponsorship packet and deck.",
    subBrand: "bm-tp-master",
    kitProfileId: "full-launch",
    seedVariantId: "MV-ED-HERO-BLEED",
    accent: "#13B1F3",
    chip: "Flagship",
    facts: {
      name: "TransPerfectNEXT 2026",
      subBrand: "bm-tp-master",
      city: "London, UK",
      venue: "QEII Centre Westminster",
      startDate: "2026-09-24",
      endDate: "2026-09-25",
      registrationUrl: "https://transperfect.com/next",
      hashtag: "#TransPerfectNEXT",
      speakers: [
        { name: "Phil Shawe", role: "CEO, TransPerfect" },
        { name: "Ana Ferreira", role: "SVP, GlobalLink" },
      ],
      sponsors: [],
      tone: "confident",
    },
    phases: [
      {
        when: "T-90",
        label: "Save the date",
        detail: "Division-accented LinkedIn ads (navy + light) and square teasers.",
        formats: ["linkedin-link-1200x627", "linkedin-post-1200x1200"],
      },
      {
        when: "T-45",
        label: "Speaker drumbeat",
        detail: "Speaker cards and content banners, one per division.",
        formats: ["square-1080", "portrait-1080x1350"],
      },
      {
        when: "T-21",
        label: "Advocacy",
        detail: "Advocacy squares for internal and partner amplification.",
        formats: ["linkedin-post-1200x1200", "email-header-1200x400"],
      },
      {
        when: "Day of",
        label: "On-site",
        detail: "G-series signage, S-series screens and P-series pillars.",
        formats: ["x-1600x900", "story-1080x1920"],
      },
      {
        when: "T+7",
        label: "Recap",
        detail: "Highlights link card plus sponsorship follow-up packet.",
        formats: ["linkedin-link-1200x627"],
      },
    ],
    deliverables: [
      {
        surface: "digital",
        label: "Division social set",
        detail: "LinkedIn navy/light, squares, content and email banners per division.",
        spec: "1200×627 · 1200×1200 · 1200×400",
      },
      {
        surface: "signage",
        label: "G-series general signage",
        detail: "Welcome, registration, wayfinding and room posters.",
        spec: "US Letter 8.5×11 in · A4 210×297 mm",
      },
      {
        surface: "signage",
        label: "P-series pillar wraps",
        detail: "Logo, location and sponsor pillar signage.",
        spec: "15.75×78.7 in (40×200 cm)",
      },
      {
        surface: "digital",
        label: "S-series screen imagery",
        detail: "Stage, foyer and breakout screen designs.",
      },
      {
        surface: "print",
        label: "Sponsorship packet",
        detail: "Tiered packet in US Letter and A4.",
      },
      { surface: "digital", label: "PowerPoint template", detail: "16:9 division-accented deck." },
    ],
    kpis: [
      { label: "Registrations", target: "2,400" },
      { label: "Divisions activated", target: "11" },
      { label: "Sponsor packages sold", target: "18" },
    ],
  },
  {
    id: "next-city-series",
    kind: "roadshow",
    name: "TransPerfect NEXT · City Series",
    tagline: "One brand system, every market.",
    intent:
      "Regional NEXT editions that reuse the London flagship system end to end. Only the city, venue and date line change, so every post, sign and deck stays in lockstep across locations.",
    subBrand: "bm-tp-master",
    kitProfileId: "event-kit",
    seedVariantId: "MV-INS-BIG-IDEA",
    accent: "#3BBEB6",
    chip: "City Series",
    facts: {
      name: "TransPerfectNEXT City Series",
      subBrand: "bm-tp-master",
      city: "Multi-city · dates TBC",
      venue: "Regional venues",
      startDate: "2026-10-06",
      registrationUrl: "https://transperfect.com/next/cities",
      hashtag: "#TransPerfectNEXT",
      speakers: [{ name: "Regional lead", role: "Division host" }],
      sponsors: [],
      tone: "confident",
    },
    phases: [
      {
        when: "T-45",
        label: "City announce",
        detail: "City/venue line swapped into the flagship LinkedIn ad and square.",
        formats: ["linkedin-link-1200x627", "linkedin-post-1200x1200"],
      },
      {
        when: "T-14",
        label: "Local invite",
        detail: "Regional email banner and speaker cards.",
        formats: ["email-header-1200x400", "square-1080"],
      },
      {
        when: "Day of",
        label: "On-site",
        detail: "Compact signage set — welcome, registration, room signs.",
        formats: ["story-1080x1920"],
      },
      {
        when: "T+5",
        label: "Recap + next city",
        detail: "Recap link card that hands off to the following stop.",
        formats: ["linkedin-link-1200x627"],
      },
    ],
    deliverables: [
      {
        surface: "digital",
        label: "City social set",
        detail: "Flagship layouts with the city/venue line swapped.",
      },
      {
        surface: "signage",
        label: "Compact signage kit",
        detail: "Welcome, registration and room signs in A4 and US Letter.",
      },
      { surface: "email", label: "Regional invite", detail: "1200×400 localized header." },
      { surface: "digital", label: "Host deck", detail: "16:9 deck with the regional agenda." },
    ],
    kpis: [
      { label: "Cities in series", target: "6" },
      { label: "Attendees per stop", target: "180" },
      { label: "Flagship registrations driven", target: "600" },
    ],
  },
];


export const EVENT_PLAYBOOKS_BY_ID: Record<string, EventPlaybook> = Object.fromEntries(
  EVENT_PLAYBOOKS.map((p) => [p.id, p]),
);

export function getPlaybook(id: string): EventPlaybook | undefined {
  return EVENT_PLAYBOOKS_BY_ID[id];
}

// ────────────────────────────────────────────────────────────────────────────
// Marketing-collateral catalog. Combines the playbook's live deliverables with
// a rich standard set of production pieces every enterprise event needs.
// Anything not currently rendered by the kit is flagged `coming-soon`, so the
// demo page can preview the full scope without pretending each piece renders.
// ────────────────────────────────────────────────────────────────────────────

const BASE_COLLATERAL: PlaybookDeliverable[] = [
  {
    surface: "print",
    category: "Sponsorship",
    label: "Sponsorship prospectus",
    detail: "Tiered packet — audience, benchmarks, package inclusions.",
    spec: "8.5×11in · 12pp PDF",
    status: "coming-soon",
  },
  {
    surface: "print",
    category: "Sponsorship",
    label: "Sponsor rate card",
    detail: "One-page tier ladder with investment + placement matrix.",
    spec: "8.5×11in",
    status: "coming-soon",
  },
  {
    surface: "print",
    category: "Sponsorship",
    label: "Sponsor thank-you certificate",
    detail: "Post-event partner acknowledgement · gold foil.",
    spec: "8.5×11in",
    status: "coming-soon",
  },
  {
    surface: "wearable",
    category: "Wearables & Badges",
    label: "Attendee badge",
    detail: "Name, role, session tracks with colored track dot.",
    spec: "3.5×4.5in · CR80",
    status: "coming-soon",
  },
  {
    surface: "wearable",
    category: "Wearables & Badges",
    label: "Speaker badge",
    detail: "Elevated speaker treatment + sponsor logo strip.",
    spec: "3.5×4.5in · CR80",
    status: "coming-soon",
  },
  {
    surface: "wearable",
    category: "Wearables & Badges",
    label: "Sponsor / staff badge",
    detail: "Distinct pattern for expo staff and sponsor reps.",
    spec: "3.5×4.5in · CR80",
    status: "coming-soon",
  },
  {
    surface: "wearable",
    category: "Wearables & Badges",
    label: "Lanyard artwork",
    detail: "Repeat print — wordmark + hashtag every 6in.",
    spec: "36in loop · 3/4in wide",
    status: "coming-soon",
  },
  {
    surface: "wearable",
    category: "Wearables & Badges",
    label: "Wristband set (VIP · press · staff)",
    detail: "Tyvek wristband color set with QR access.",
    spec: "10×1in",
    status: "coming-soon",
  },
  {
    surface: "print",
    category: "Print & Collateral",
    label: "Program guide",
    detail: "Multi-page agenda · sessions · speakers · sponsors.",
    spec: "5.5×8.5in · saddle-stitch",
    status: "coming-soon",
  },
  {
    surface: "print",
    category: "Print & Collateral",
    label: "Tri-fold brochure",
    detail: "Handout with tracks, sessions, and CTA panels.",
    spec: "8.5×11in · tri-fold",
    status: "coming-soon",
  },
  {
    surface: "print",
    category: "Print & Collateral",
    label: "Post-event thank-you card",
    detail: "A6 card with QR to replay + NPS survey.",
    spec: "5.8×4.1in",
    status: "coming-soon",
  },
  {
    surface: "print",
    category: "Print & Collateral",
    label: "Business card template",
    detail: "Event-branded cards for on-site staff.",
    spec: "3.5×2in",
    status: "coming-soon",
  },
  {
    surface: "print",
    category: "Print & Collateral",
    label: "Session tent card",
    detail: "Numbered A5 folded tent for room signage.",
    spec: "5.8×8.3in folded",
    status: "coming-soon",
  },
  {
    surface: "email",
    category: "Email & Direct",
    label: "Save-the-date HTML",
    detail: "Modular HTML email · light + dark.",
    spec: "600px column",
    status: "coming-soon",
  },
  {
    surface: "email",
    category: "Email & Direct",
    label: "Speaker-confirmation email",
    detail: "Ops email with logistics, AV, arrival window.",
    spec: "600px column",
    status: "coming-soon",
  },
  {
    surface: "email",
    category: "Email & Direct",
    label: "Sponsor-outreach template",
    detail: "Cold-outreach with prospectus attached.",
    spec: "Plain-text + HTML",
    status: "coming-soon",
  },
  {
    surface: "digital",
    category: "Digital & Web",
    label: "Zoom / Teams background pack",
    detail: "Three color variants for speakers and sales.",
    spec: "1920×1080",
    status: "coming-soon",
  },
  {
    surface: "digital",
    category: "Digital & Web",
    label: "LinkedIn header set",
    detail: "Speaker + team personal-header templates.",
    spec: "1584×396",
    status: "coming-soon",
  },
  {
    surface: "digital",
    category: "Digital & Web",
    label: "Website hero + countdown",
    detail: "Homepage hero module with live countdown.",
    spec: "1920×720",
    status: "coming-soon",
  },
];

const SIGNAGE_ADDONS: PlaybookDeliverable[] = [
  {
    surface: "signage",
    category: "Signage & Environment",
    label: "Retractable banner",
    detail: "Free-standing entrance banner with hashtag lockup.",
    spec: "33×80in retractable",
    status: "coming-soon",
  },
  {
    surface: "signage",
    category: "Signage & Environment",
    label: "Large-format hall banner",
    detail: "Corridor / façade banner for entrance drama.",
    spec: "10×3ft vinyl",
    status: "coming-soon",
  },
  {
    surface: "signage",
    category: "Signage & Environment",
    label: "Stage backdrop",
    detail: "Main-stage backdrop with sponsor rail.",
    spec: "16×9ft SEG fabric",
    status: "coming-soon",
  },
  {
    surface: "signage",
    category: "Signage & Environment",
    label: "Wayfinding tower",
    detail: "Freestanding directional tower per hall.",
    spec: "24×72in double-sided",
    status: "coming-soon",
  },
  {
    surface: "signage",
    category: "Signage & Environment",
    label: "Floor decals",
    detail: "Numbered directional decals to session rooms.",
    spec: "24×24in vinyl",
    status: "coming-soon",
  },
  {
    surface: "signage",
    category: "Signage & Environment",
    label: "Registration desk runner",
    detail: "Reception counter wrap with hashtag lockup.",
    spec: "72×36in",
    status: "coming-soon",
  },
  {
    surface: "signage",
    category: "Signage & Environment",
    label: "Gobo projection",
    detail: "Logo gobo template for cocktail hour rooms.",
    spec: "Vector · single color",
    status: "coming-soon",
  },
];

const MERCH_ADDONS: PlaybookDeliverable[] = [
  {
    surface: "merch",
    category: "Merch & Swag",
    label: "T-shirt design",
    detail: "Front-logo, back-hashtag, unisex heavyweight.",
    spec: "12×16in print area",
    status: "coming-soon",
  },
  {
    surface: "merch",
    category: "Merch & Swag",
    label: "Tote bag artwork",
    detail: "Canvas tote with wordmark + venue city.",
    spec: "15×16in",
    status: "coming-soon",
  },
  {
    surface: "merch",
    category: "Merch & Swag",
    label: "Notebook cover",
    detail: "A5 lay-flat notebook — logo + date block.",
    spec: "5.8×8.3in",
    status: "coming-soon",
  },
  {
    surface: "merch",
    category: "Merch & Swag",
    label: "Water bottle wrap",
    detail: "Aluminum bottle wrap · 750ml.",
    spec: "8.6×2.7in",
    status: "coming-soon",
  },
  {
    surface: "merch",
    category: "Merch & Swag",
    label: "Sticker sheet",
    detail: "Die-cut sticker set with hashtag + division marks.",
    spec: "8.5×11in sheet",
    status: "coming-soon",
  },
];

const VIDEO_ADDONS: PlaybookDeliverable[] = [
  {
    surface: "video",
    category: "Video & Motion",
    label: "Sponsor loop reel",
    detail: "Rotating sponsor rail for house monitors.",
    spec: "1920×1080 · 60s loop",
    status: "coming-soon",
  },
  {
    surface: "video",
    category: "Video & Motion",
    label: "Countdown video",
    detail: "9:16 stage countdown before doors open.",
    spec: "1080×1920 · 5-min",
    status: "coming-soon",
  },
  {
    surface: "video",
    category: "Video & Motion",
    label: "Session sizzle",
    detail: "15-second track opener animation.",
    spec: "1920×1080",
    status: "coming-soon",
  },
];

const HEAVY_PHYSICAL_KINDS: PlaybookKind[] = [
  "conference",
  "summit",
  "launch",
  "trade-show",
  "awards",
  "roadshow",
  "field-day",
];

/**
 * Rich collateral catalog for a playbook — combines existing live deliverables
 * (auto-flagged `status: "live"`) with a curated set of standard marketing
 * collateral marked `coming-soon`. Deduped against the playbook's own labels.
 */
export function getExpandedCollateral(pb: EventPlaybook): PlaybookDeliverable[] {
  const live: PlaybookDeliverable[] = pb.deliverables.map((d) => ({
    ...d,
    status: d.status ?? "live",
    category: d.category ?? inferCategoryFromSurface(d.surface),
  }));

  let extras: PlaybookDeliverable[] = [...BASE_COLLATERAL];
  if (HEAVY_PHYSICAL_KINDS.includes(pb.kind)) {
    extras = extras.concat(SIGNAGE_ADDONS, MERCH_ADDONS);
  }
  // Webinars and briefings drop the video sizzle set — they're not motion-heavy.
  if (pb.kind !== "webinar" && pb.kind !== "briefing") {
    extras = extras.concat(VIDEO_ADDONS);
  }

  // Dedup coming-soon items whose label already ships live.
  const liveKey = new Set(live.map((d) => d.label.toLowerCase()));
  const filtered = extras.filter((d) => !liveKey.has(d.label.toLowerCase()));

  return [...live, ...filtered];
}

function inferCategoryFromSurface(s: PlaybookDeliverable["surface"]): CollateralCategory {
  switch (s) {
    case "signage":
      return "Signage & Environment";
    case "print":
      return "Print & Collateral";
    case "video":
      return "Video & Motion";
    case "email":
      return "Email & Direct";
    case "wearable":
      return "Wearables & Badges";
    case "merch":
      return "Merch & Swag";
    default:
      return "Digital & Web";
  }
}

export const COLLATERAL_CATEGORY_ORDER: CollateralCategory[] = [
  "Sponsorship",
  "Wearables & Badges",
  "Signage & Environment",
  "Print & Collateral",
  "Video & Motion",
  "Digital & Web",
  "Email & Direct",
  "Merch & Swag",
];
