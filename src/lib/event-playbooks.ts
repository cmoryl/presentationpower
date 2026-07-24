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
      { when: "T-30", label: "Tease", detail: "Countdown story + eyebrow callout across LinkedIn.", formats: ["story-1080x1920", "square-1080", "callout-1200x628"] },
      { when: "T-7", label: "Prime", detail: "Registration push, exec preview posts, email header.", formats: ["portrait-1080x1350", "linkedin-link-1200x627", "email-header-1200x400"] },
      { when: "Day of", label: "Launch", detail: "Hero reveal, live-post loop, YouTube keynote card.", formats: ["callout-1200x628", "story-1080x1920", "youtube-1280x720", "linkedin-post-1200x1200"] },
      { when: "T+1", label: "Echo", detail: "Recap thread, press callouts, thank-you sponsors.", formats: ["square-1080", "linkedin-link-1200x627", "email-header-1200x400"] },
    ],
    deliverables: [
      { surface: "digital", label: "Hero banner + microsite header", detail: "1200×628 + 1600×900 with a single stat callout." },
      { surface: "digital", label: "LinkedIn drumbeat (4 posts)", detail: "Tease → prime → launch → echo, one narrative." },
      { surface: "email", label: "Announcement email header", detail: "1200×400 with date, venue, single CTA." },
      { surface: "video", label: "Story reel loop", detail: "1080×1920 · 9-second bumper with product beat." },
      { surface: "print", label: "Executive one-pager", detail: "Press-ready case-study spread for briefings." },
    ],
    kpis: [
      { label: "Impressions", target: "2.5M", detail: "Across LinkedIn + email in the first 72 hours." },
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
      { when: "T-60", label: "Save the date", detail: "Speaker teaser cards + agenda dropper.", formats: ["portrait-1080x1350", "linkedin-post-1200x1200"] },
      { when: "T-14", label: "Program reveal", detail: "Session tracks, sponsor rails, exec spotlight.", formats: ["callout-1200x628", "story-1080x1920", "linkedin-link-1200x627"] },
      { when: "Day of", label: "On-site", detail: "Wayfinding, badges, live-post templates.", formats: ["square-1080", "portrait-1080x1350", "story-1080x1920"] },
      { when: "T+7", label: "Recap", detail: "Highlights reel, sponsor thanks, replay push.", formats: ["email-header-1200x400", "linkedin-link-1200x627", "youtube-1280x720"] },
    ],
    deliverables: [
      { surface: "signage", label: "Stage backdrop + wayfinding", detail: "16:9 stage, 9:16 wayfinding towers, sponsor loop." },
      { surface: "print", label: "Badges + lanyards", detail: "Attendee, speaker, sponsor variants." },
      { surface: "digital", label: "Speaker card set", detail: "One card per session · 1080×1350 portrait." },
      { surface: "digital", label: "Live-post loop", detail: "Session-ID templated square + story." },
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
      { when: "T-90", label: "Abstract call", detail: "Poster submission signal + eligibility card.", formats: ["portrait-1080x1350", "email-header-1200x400"] },
      { when: "T-30", label: "Program", detail: "Track reveal · principal investigators.", formats: ["linkedin-post-1200x1200", "callout-1200x628"] },
      { when: "Day of", label: "Session", detail: "Session-ID cards, poster wayfinding.", formats: ["portrait-1080x1350", "story-1080x1920"] },
      { when: "T+14", label: "Publication", detail: "Peer-reviewed recap + citation cards.", formats: ["callout-1200x628", "linkedin-link-1200x627"] },
    ],
    deliverables: [
      { surface: "print", label: "Poster grid (A0)", detail: "48 posters · 33.1×46.8in Trial Interactive template." },
      { surface: "signage", label: "Session boards", detail: "Track colored, ADA-compliant contrast." },
      { surface: "digital", label: "Principal investigator cards", detail: "Portrait · citation slot preserved." },
      { surface: "email", label: "Abstract-accepted email", detail: "1200×400 header + agenda link." },
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
      { when: "T-21", label: "Invitation", detail: "Confidential invite + agenda card.", formats: ["email-header-1200x400", "callout-1200x628"] },
      { when: "T-7", label: "Briefing", detail: "Pre-read summary + speaker list.", formats: ["linkedin-link-1200x627", "portrait-1080x1350"] },
      { when: "Day of", label: "Sessions", detail: "Roundtable session cards.", formats: ["square-1080", "callout-1200x628"] },
    ],
    deliverables: [
      { surface: "email", label: "Confidential invite", detail: "Password-gated · white-glove tone." },
      { surface: "print", label: "Agenda dossier", detail: "A4 dark-navy dossier with GC-only sessions." },
      { surface: "digital", label: "Chatham House card set", detail: "Non-attributable quote graphics." },
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
      speakers: [
        { name: "Miriam Cho", role: "VP Product, GlobalLink" },
      ],
      sponsors: [],
      tone: "curious",
    },
    phases: [
      { when: "T-14", label: "Register", detail: "LinkedIn link card + registration story.", formats: ["linkedin-link-1200x627", "story-1080x1920"] },
      { when: "T-1", label: "Reminder", detail: "Story countdown + email header.", formats: ["story-1080x1920", "email-header-1200x400"] },
      { when: "T+1", label: "Recap", detail: "Replay callout + key quote card.", formats: ["callout-1200x628", "square-1080"] },
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
      { when: "T-14", label: "Invite", detail: "White-glove confidential invitation.", formats: ["email-header-1200x400", "callout-1200x628"] },
      { when: "T-3", label: "Pre-read", detail: "Dossier delivery · overnight.", formats: ["linkedin-link-1200x627"] },
      { when: "Day of", label: "In-room", detail: "Seat cards, agenda, room screens.", formats: ["callout-1200x628"] },
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
      { when: "T-30", label: "Tour reveal", detail: "Route map card + city stack.", formats: ["callout-1200x628", "linkedin-post-1200x1200"] },
      { when: "T-7 per city", label: "City prime", detail: "City-templated invites × 5.", formats: ["portrait-1080x1350", "email-header-1200x400"] },
      { when: "Day of each", label: "Live", detail: "Story + square with venue token.", formats: ["story-1080x1920", "square-1080"] },
      { when: "T+30", label: "Recap tour", detail: "Full-tour highlights + logo grid.", formats: ["youtube-1280x720", "linkedin-link-1200x627"] },
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
      speakers: [
        { name: "Sofia Marín", role: "Emcee" },
      ],
      sponsors: [
        { name: "MediaNext", tier: "title" },
        { name: "Sony", tier: "gold" },
      ],
      tone: "warm",
    },
    phases: [
      { when: "T-90", label: "Nominations", detail: "Nomination call + category set.", formats: ["portrait-1080x1350", "callout-1200x628"] },
      { when: "T-30", label: "Shortlist", detail: "Shortlisted nominee cards × N.", formats: ["square-1080", "linkedin-post-1200x1200"] },
      { when: "T-1", label: "Countdown", detail: "24-hour reveal story.", formats: ["story-1080x1920"] },
      { when: "T+1", label: "Winners", detail: "Winner cards + press headline.", formats: ["linkedin-link-1200x627", "email-header-1200x400", "youtube-1280x720"] },
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
      { when: "T-30", label: "Pre-show", detail: "Invite-to-booth email + LinkedIn post.", formats: ["email-header-1200x400", "linkedin-post-1200x1200"] },
      { when: "T-7", label: "Meeting requests", detail: "Speaker portrait + calendar link.", formats: ["portrait-1080x1350"] },
      { when: "Day of", label: "Live", detail: "Story updates + booth loop.", formats: ["story-1080x1920", "youtube-1280x720"] },
      { when: "T+1", label: "Follow-up", detail: "Badge-scan email + CTA.", formats: ["email-header-1200x400", "callout-1200x628"] },
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
      { when: "T-45", label: "Devrel push", detail: "GitHub README + LinkedIn post.", formats: ["linkedin-post-1200x1200", "callout-1200x628"] },
      { when: "T-14", label: "Speaker + prize reveal", detail: "Portrait + wide reveal.", formats: ["portrait-1080x1350", "x-1600x900"] },
      { when: "Day of", label: "Live", detail: "Leaderboard cards + story updates.", formats: ["square-1080", "story-1080x1920"] },
      { when: "T+1", label: "Winners", detail: "Winner card + YouTube demo reel.", formats: ["linkedin-link-1200x627", "youtube-1280x720"] },
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
      { when: "T-60", label: "Save-the-date", detail: "Invite email + portrait.", formats: ["email-header-1200x400", "portrait-1080x1350"] },
      { when: "T-14", label: "Agenda drop", detail: "Session cards + LinkedIn post.", formats: ["square-1080", "linkedin-post-1200x1200"] },
      { when: "Day of", label: "Live", detail: "Session-title 16:9 loops.", formats: ["youtube-1280x720", "story-1080x1920"] },
      { when: "T+7", label: "Recap", detail: "Highlights email + link card.", formats: ["email-header-1200x400", "linkedin-link-1200x627"] },
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
      { when: "T-14", label: "Invite", detail: "Personal-note email + calendar hold.", formats: ["email-header-1200x400"] },
      { when: "T-3", label: "Agenda", detail: "Session card + attendee list.", formats: ["callout-1200x628"] },
      { when: "T+1", label: "Recap", detail: "Executive summary link card.", formats: ["linkedin-link-1200x627"] },
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
      { when: "T-30", label: "Private invite", detail: "Named-invite email.", formats: ["email-header-1200x400"] },
      { when: "T-3", label: "Discussion doc", detail: "PDF prompt kit + callout.", formats: ["callout-1200x628"] },
      { when: "T+7", label: "Chatham write-up", detail: "Anonymized link card.", formats: ["linkedin-link-1200x627"] },
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
      speakers: [
        { name: "Kai Nakamura", role: "SVP Gaming" },
      ],
      sponsors: [{ name: "Twitch", tier: "gold" }],
      tone: "warm",
    },
    phases: [
      { when: "T-21", label: "Creator invite", detail: "Portrait + story pack.", formats: ["portrait-1080x1350", "story-1080x1920"] },
      { when: "T-7", label: "Reveal", detail: "Wide teaser + YouTube thumb.", formats: ["x-1600x900", "youtube-1280x720"] },
      { when: "Day of", label: "Live", detail: "Photo-loop signage.", formats: ["square-1080", "story-1080x1920"] },
      { when: "T+1", label: "Highlights reel", detail: "1200×627 link + YouTube thumb.", formats: ["linkedin-link-1200x627", "youtube-1280x720"] },
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
];

export const EVENT_PLAYBOOKS_BY_ID: Record<string, EventPlaybook> = Object.fromEntries(
  EVENT_PLAYBOOKS.map((p) => [p.id, p]),
);

export function getPlaybook(id: string): EventPlaybook | undefined {
  return EVENT_PLAYBOOKS_BY_ID[id];
}
