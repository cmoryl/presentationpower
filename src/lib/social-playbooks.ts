// Social playbooks — division-scoped campaign archetypes.
//
// Mirrors src/lib/event-playbooks.ts but for evergreen social campaigns
// rather than dated events. Every TransPerfect division has at least one
// preset playbook seeded from a real MODULE_VARIANT id so the demo route
// renders live assets with brand-appropriate copy — no lorem, no AI.
//
// Adding a new division playbook here surfaces automatically on /social.

import type { CampaignSource, EventFacts } from "./campaigns";
import type { PlaybookPhase, PlaybookDeliverable, PlaybookKpi } from "./event-playbooks";

export type SocialAngle =
  | "announcement"
  | "thought-leadership"
  | "case-spotlight"
  | "product-tease"
  | "hiring"
  | "milestone"
  | "partnership"
  | "brand-anthem"
  | "recruitment";

export type SocialPlaybook = {
  id: string;
  angle: SocialAngle;
  name: string;
  tagline: string;
  intent: string;
  /** BrandMode.id — controls palette + lockup. */
  subBrand: string;
  /** Human-readable division badge. */
  divisionLabel: string;
  /** KitProfile.id from social-formats.ts. */
  kitProfileId: string;
  /** MODULE_VARIANT.id used as the seed source for demo renders. */
  seedVariantId: string;
  /** Copy that seeds the assets — becomes the CampaignSource. */
  copy: { title: string; summary?: string; cta?: string };
  /** Post cadence for the campaign. */
  phases: PlaybookPhase[];
  deliverables: PlaybookDeliverable[];
  kpis: PlaybookKpi[];
  accent: string;
  chip: string;
};

/** Convert playbook.copy into a CampaignSource for buildCampaignAssets. */
export function sourceFromSocialPlaybook(p: SocialPlaybook): CampaignSource {
  return { kind: "manual", copy: p.copy };
}

/** Synthesize a minimal EventFacts for the campaign pipeline. */
export function factsFromSocialPlaybook(p: SocialPlaybook): EventFacts {
  return {
    name: p.name,
    subBrand: p.subBrand,
    hashtag: "",
    speakers: [],
    sponsors: [],
    tone: "confident",
    registrationUrl: "",
  };
}

// ────────────────────────────────────────────────────────────────────────────
// The catalog — one signature playbook per division + strategic add-ons.
// Ordered by TransPerfect house priority: Master anthem first, then the
// biggest divisions, then the corporate/co-brand plays.
// ────────────────────────────────────────────────────────────────────────────
export const SOCIAL_PLAYBOOKS: SocialPlaybook[] = [
  {
    id: "master-brand-anthem",
    angle: "brand-anthem",
    name: "TransPerfect brand anthem",
    tagline: "The house-level manifesto in one square, one story, one link.",
    intent:
      "The always-on TransPerfect voice — one big-idea headline that flexes across the master palette and every social surface. Use to open a quarter, close a milestone, or re-set the story.",
    subBrand: "bm-tp-master",
    divisionLabel: "TransPerfect",
    kitProfileId: "social-essentials",
    seedVariantId: "MV-INS-BIG-IDEA",
    accent: "#003FC7",
    chip: "Master",
    copy: {
      title: "Every language. Every content type. One partner.",
      summary:
        "TransPerfect powers global growth for 5,000+ enterprises across 200+ languages — with the technology, service, and scale to move at the speed of business.",
      cta: "See how we work",
    },
    phases: [
      { when: "Week 1", label: "Anthem drop", detail: "Big-idea square + story + LinkedIn link.", formats: ["square-1080", "story-1080x1920", "linkedin-link-1200x627"] },
      { when: "Week 2", label: "Proof", detail: "Follow-up stat callout + case metrics.", formats: ["callout-1200x628", "portrait-1080x1350"] },
      { when: "Week 3", label: "Engage", detail: "Question prompt · community reply thread.", formats: ["square-1080"] },
    ],
    deliverables: [
      { surface: "digital", label: "Anthem square", detail: "1080×1080 with the master lockup." },
      { surface: "digital", label: "Story loop", detail: "1080×1920 vertical for IG + LI stories." },
      { surface: "digital", label: "LinkedIn link card", detail: "1200×628 for the anthem article." },
      { surface: "digital", label: "Portrait proof card", detail: "1080×1350 stat callout follow-up." },
    ],
    kpis: [
      { label: "Impressions · 30 days", target: "1.2M" },
      { label: "Engagement rate", target: "4.8%", detail: "LinkedIn benchmark for enterprise." },
      { label: "Profile visits", target: "24k" },
    ],
  },
  {
    id: "media-localization-spotlight",
    angle: "case-spotlight",
    name: "Media localization spotlight",
    tagline: "Editorial-tier proof for a hero client dub or subtitle run.",
    intent:
      "TransPerfect Media casework told in a magazine voice — one client, one title, one impressive scale stat. Story-first with pull-quote and territory count.",
    subBrand: "bm-tp-media",
    divisionLabel: "TransPerfect Media",
    kitProfileId: "full-launch",
    seedVariantId: "MV-CASE-METRICS",
    accent: "#EC388A",
    chip: "Media",
    copy: {
      title: "One title. 62 languages. Zero broadcast delays.",
      summary:
        "We localized the season's biggest release into 62 languages with a single continuity pipeline — every territory launched day-and-date.",
      cta: "Read the case study",
    },
    phases: [
      { when: "Day 1", label: "Reveal", detail: "Editorial cover + stat headline.", formats: ["portrait-1080x1350", "linkedin-post-1200x1200"] },
      { when: "Day 3", label: "Pull-quote", detail: "Client executive quote card.", formats: ["square-1080", "callout-1200x628"] },
      { when: "Day 7", label: "Territory map", detail: "Global rollout story + YouTube trailer card.", formats: ["story-1080x1920", "youtube-1280x720"] },
      { when: "Day 14", label: "Recap", detail: "LinkedIn link card + email header.", formats: ["linkedin-link-1200x627", "email-header-1200x400"] },
    ],
    deliverables: [
      { surface: "digital", label: "Editorial portrait cover", detail: "1080×1350 magazine-style hero." },
      { surface: "digital", label: "Pull-quote card", detail: "Client attribution + territory list." },
      { surface: "video", label: "Story trailer bumper", detail: "1080×1920 9-second edit." },
      { surface: "email", label: "Case study email header", detail: "1200×400 with CTA." },
    ],
    kpis: [
      { label: "Article opens", target: "18k" },
      { label: "Follow-on RFPs", target: "12" },
      { label: "Press pickups · T+30", target: "8" },
    ],
  },
  {
    id: "legal-ediscovery-insight",
    angle: "thought-leadership",
    name: "Legal · eDiscovery insight",
    tagline: "General-counsel thought leadership in the corporate-dark palette.",
    intent:
      "One well-earned data point on cross-border discovery, matter management, or regulatory friction. Reads like a memo, not a marketing post — the tone GCs open.",
    subBrand: "bm-tp-legal",
    divisionLabel: "TransPerfect Legal",
    kitProfileId: "email-set",
    seedVariantId: "MV-INS-SO-WHAT",
    accent: "#03002C",
    chip: "Legal",
    copy: {
      title: "76% of GCs say cross-border discovery still surprises them at trial.",
      summary:
        "New TransPerfect Legal research across 400 general counsel finds the biggest matter-cost overruns come from late-stage foreign-language review.",
      cta: "Download the brief",
    },
    phases: [
      { when: "Day 1", label: "Data drop", detail: "Stat headline + link card.", formats: ["callout-1200x628", "linkedin-link-1200x627"] },
      { when: "Day 4", label: "So what", detail: "Implication carousel + email.", formats: ["portrait-1080x1350", "email-header-1200x400"] },
      { when: "Day 10", label: "Debrief", detail: "Roundtable invite callout.", formats: ["callout-1200x628"] },
    ],
    deliverables: [
      { surface: "digital", label: "Stat headline card", detail: "Landscape callout · dark palette." },
      { surface: "email", label: "GC-list email header", detail: "1200×400 with brief-download CTA." },
      { surface: "digital", label: "Implication portrait", detail: "1080×1350 · so-what stack." },
    ],
    kpis: [
      { label: "Brief downloads", target: "1,400" },
      { label: "GC-level engagement", target: "9%" },
      { label: "MQL from brief", target: "180" },
    ],
  },
  {
    id: "gaming-scale-drop",
    angle: "milestone",
    name: "Gaming · player-scale drop",
    tagline: "Loud, punchy stat drop tuned for gaming feeds.",
    intent:
      "TransPerfect Gaming loves a big number: players moved, languages shipped, hours of VO recorded. Bright accent, tight headline, high-contrast for platform feeds.",
    subBrand: "bm-tp-games",
    divisionLabel: "TransPerfect Gaming",
    kitProfileId: "full-launch",
    seedVariantId: "MV-PROOF-STATS-3",
    accent: "#A6FA87",
    chip: "Gaming",
    copy: {
      title: "1 billion words of gameplay, localized in 2026.",
      summary:
        "Across MMOs, live-service ops, and console launches — the TransPerfect Gaming engine shipped 1B words of localized gameplay this year.",
      cta: "Talk to Gaming ops",
    },
    phases: [
      { when: "Drop day", label: "Stat drop", detail: "Big number square + story.", formats: ["square-1080", "story-1080x1920"] },
      { when: "Day 2", label: "Breakdown", detail: "3-stat portrait card + YouTube thumb.", formats: ["portrait-1080x1350", "youtube-1280x720"] },
      { when: "Day 5", label: "Studio spotlight", detail: "Featured studio testimonial.", formats: ["callout-1200x628", "linkedin-post-1200x1200"] },
    ],
    deliverables: [
      { surface: "digital", label: "Big-number square", detail: "1080×1080 max-contrast." },
      { surface: "video", label: "Story reel bumper", detail: "9-second vertical." },
      { surface: "digital", label: "Studio testimonial", detail: "1200×628 with logo." },
    ],
    kpis: [
      { label: "Video views · 7-day", target: "480k" },
      { label: "Studio inbound", target: "22" },
      { label: "Share rate", target: "3.2%" },
    ],
  },
  {
    id: "digital-globallink-tease",
    angle: "product-tease",
    name: "GlobalLink product tease",
    tagline: "Pre-launch teaser for a new GlobalLink capability.",
    intent:
      "Two-week teaser drumbeat before a GlobalLink release — feature hint, product portrait, then the reveal. Digital palette, clean product-first framing.",
    subBrand: "bm-tp-digital",
    divisionLabel: "TransPerfect Digital",
    kitProfileId: "full-launch",
    seedVariantId: "MV-SOL-FEATURE-LIST",
    accent: "#0057FF",
    chip: "Digital",
    copy: {
      title: "Something new is coming to GlobalLink AI.",
      summary:
        "A faster path from source content to launch-ready translations across 40+ file types — with human-in-the-loop review baked in.",
      cta: "Get notified",
    },
    phases: [
      { when: "T-14", label: "Hint", detail: "Silhouette tease · story.", formats: ["story-1080x1920", "square-1080"] },
      { when: "T-7", label: "Feature", detail: "Feature list portrait + link card.", formats: ["portrait-1080x1350", "linkedin-link-1200x627"] },
      { when: "T-1", label: "Countdown", detail: "24-hour reveal story.", formats: ["story-1080x1920"] },
      { when: "Launch", label: "Reveal", detail: "Callout + LinkedIn post.", formats: ["callout-1200x628", "linkedin-post-1200x1200"] },
    ],
    deliverables: [
      { surface: "digital", label: "Silhouette tease", detail: "Blurred product square." },
      { surface: "digital", label: "Feature-list portrait", detail: "1080×1350 · 3 features." },
      { surface: "digital", label: "Reveal callout", detail: "1200×628 launch banner." },
    ],
    kpis: [
      { label: "Waitlist signups", target: "3.5k" },
      { label: "Product page visits", target: "42k" },
      { label: "Trial activations · T+7", target: "620" },
    ],
  },
  {
    id: "lifesci-regulatory-milestone",
    angle: "milestone",
    name: "Life Sciences · regulatory milestone",
    tagline: "Compliance-safe milestone card for FDA/EMA moments.",
    intent:
      "TransPerfect Life Sciences announces a submission, approval, or accreditation — restrained tone, substantiated numbers, and a citation slot preserved for regulatory review.",
    subBrand: "bm-tp-lifesci",
    divisionLabel: "TransPerfect Life Sciences",
    kitProfileId: "email-set",
    seedVariantId: "MV-INS-CALLOUT",
    accent: "#4A90E2",
    chip: "Life Sciences",
    copy: {
      title: "ISO 17100 and 13485 recertified across every clinical hub.",
      summary:
        "TransPerfect Life Sciences maintained dual-standard certification across all clinical translation and medical device operations for a fifth consecutive year.",
      cta: "Review our certifications",
    },
    phases: [
      { when: "Day 1", label: "Announcement", detail: "Callout + LinkedIn link card.", formats: ["callout-1200x628", "linkedin-link-1200x627"] },
      { when: "Day 5", label: "Client note", detail: "Email header to sponsors + CROs.", formats: ["email-header-1200x400"] },
    ],
    deliverables: [
      { surface: "digital", label: "Certification callout", detail: "1200×628 with cite line." },
      { surface: "email", label: "Sponsor notification", detail: "1200×400 branded." },
      { surface: "digital", label: "LinkedIn link card", detail: "For the compliance page." },
    ],
    kpis: [
      { label: "Sponsor reads", target: "4,800" },
      { label: "Regulatory affairs replies", target: "36" },
    ],
  },
  {
    id: "trial-interactive-recruitment",
    angle: "recruitment",
    name: "Trial Interactive · study recruitment",
    tagline: "Patient- and site-recruitment drumbeat for active studies.",
    intent:
      "Multi-format recruitment push for a specific clinical study — bright, humane, action-first. Reads inclusive without over-promising outcomes.",
    subBrand: "bm-trial-interactive",
    divisionLabel: "Trial Interactive",
    kitProfileId: "full-launch",
    seedVariantId: "MV-INS-OPPORTUNITY-SIZE",
    accent: "#5B9BD5",
    chip: "Clinical",
    copy: {
      title: "Now enrolling: a study for adults with treatment-resistant migraine.",
      summary:
        "A phase-3 study is enrolling in 14 countries. Site-nomination and patient-referral portals are open through Q1 2027.",
      cta: "See eligibility",
    },
    phases: [
      { when: "Week 1", label: "Kickoff", detail: "Portrait + story with eligibility.", formats: ["portrait-1080x1350", "story-1080x1920"] },
      { when: "Week 2", label: "Site rally", detail: "Site-nomination LinkedIn post.", formats: ["linkedin-post-1200x1200", "callout-1200x628"] },
      { when: "Week 3", label: "Patient story", detail: "Anonymous participant reflection.", formats: ["square-1080", "story-1080x1920"] },
      { when: "Ongoing", label: "Weekly update", detail: "Enrollment progress callout.", formats: ["callout-1200x628"] },
    ],
    deliverables: [
      { surface: "digital", label: "Eligibility portrait", detail: "1080×1350 with criteria." },
      { surface: "digital", label: "Site nomination card", detail: "1200×1200 for LinkedIn." },
      { surface: "digital", label: "Progress callout", detail: "Weekly enrollment update." },
    ],
    kpis: [
      { label: "Portal signups", target: "2,600" },
      { label: "Site nominations", target: "88" },
      { label: "Enrollment / month", target: "180" },
    ],
  },
  {
    id: "enterprise-investor-update",
    angle: "announcement",
    name: "Enterprise · investor update",
    tagline: "Quarterly-milestone card in the corporate-navy system.",
    intent:
      "Board- and investor-safe milestone: revenue moment, acquisition, or strategic hire. Restrained, on-brand, and paired with an email header for the shareholder note.",
    subBrand: "bm-enterprise",
    divisionLabel: "TransPerfect · Enterprise",
    kitProfileId: "email-set",
    seedVariantId: "MV-INS-CALLOUT",
    accent: "#03002C",
    chip: "Enterprise",
    copy: {
      title: "TransPerfect closes 2026 with $1.5B in annual revenue.",
      summary:
        "Twenty-fourth consecutive year of profitable growth · 5,000+ enterprise clients · zero external investors.",
      cta: "Read the shareholder note",
    },
    phases: [
      { when: "Day 1", label: "Milestone", detail: "Callout + LinkedIn link card.", formats: ["callout-1200x628", "linkedin-link-1200x627"] },
      { when: "Day 2", label: "Shareholder note", detail: "Email header + long-form link.", formats: ["email-header-1200x400"] },
      { when: "Day 7", label: "Recap", detail: "Chart callout + summary square.", formats: ["callout-1200x628", "square-1080"] },
    ],
    deliverables: [
      { surface: "digital", label: "Milestone callout", detail: "Dark-navy 1200×628." },
      { surface: "email", label: "Shareholder header", detail: "1200×400 with CEO CTA." },
      { surface: "digital", label: "Recap square", detail: "1080×1080 chart preview." },
    ],
    kpis: [
      { label: "Press pickups", target: "40" },
      { label: "Shareholder note opens", target: "72%" },
      { label: "Analyst mentions · T+30", target: "18" },
    ],
  },
  {
    id: "cobrand-partnership",
    angle: "partnership",
    name: "Co-brand partnership drop",
    tagline: "Joint-launch template when TransPerfect + partner share a moment.",
    intent:
      "Two-logo lockup, one big-idea headline, and format-per-partner-channel. The co-brand palette keeps both logos legible without forcing either into the other's palette.",
    subBrand: "bm-cobrand",
    divisionLabel: "TransPerfect · Co-brand",
    kitProfileId: "full-launch",
    seedVariantId: "MV-PROOF-LOGOS-FEATURED",
    accent: "#C2A3FF",
    chip: "Co-brand",
    copy: {
      title: "TransPerfect + [Partner] · one workflow, every language.",
      summary:
        "A new integration brings TransPerfect's language operations directly into [Partner]'s platform — with zero context-switching for content teams.",
      cta: "See the integration",
    },
    phases: [
      { when: "Day 1", label: "Joint launch", detail: "Co-branded callout + LinkedIn post.", formats: ["callout-1200x628", "linkedin-post-1200x1200"] },
      { when: "Day 3", label: "Deep-dive", detail: "Feature portrait + LinkedIn link card.", formats: ["portrait-1080x1350", "linkedin-link-1200x627"] },
      { when: "Day 7", label: "Customer stories", detail: "Story + YouTube integration demo.", formats: ["story-1080x1920", "youtube-1280x720"] },
    ],
    deliverables: [
      { surface: "digital", label: "Two-logo callout", detail: "Balanced lockup · 1200×628." },
      { surface: "digital", label: "Feature portrait", detail: "1080×1350 integration overview." },
      { surface: "video", label: "Demo thumb", detail: "1280×720 YouTube preview." },
    ],
    kpis: [
      { label: "Integration installs · T+30", target: "1,200" },
      { label: "Joint webinar registrations", target: "3.8k" },
      { label: "Partner co-marketed leads", target: "460" },
    ],
  },
];

export const SOCIAL_PLAYBOOKS_BY_ID: Record<string, SocialPlaybook> = Object.fromEntries(
  SOCIAL_PLAYBOOKS.map((p) => [p.id, p]),
);

export function getSocialPlaybook(id: string): SocialPlaybook | undefined {
  return SOCIAL_PLAYBOOKS_BY_ID[id];
}

/** Angle-grouped list for the /social hub. */
export const SOCIAL_ANGLES: Array<{ id: SocialAngle; label: string }> = [
  { id: "brand-anthem", label: "Brand anthem" },
  { id: "product-tease", label: "Product tease" },
  { id: "milestone", label: "Milestone" },
  { id: "case-spotlight", label: "Case spotlight" },
  { id: "thought-leadership", label: "Thought leadership" },
  { id: "recruitment", label: "Recruitment" },
  { id: "announcement", label: "Announcement" },
  { id: "partnership", label: "Partnership" },
];
