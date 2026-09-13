// TransPerfect NEXT 2026 — NATIVE BOOTH TEMPLATES.
//
// A vendor-supplied booth wall is finished artwork: we can re-issue and reframe
// it, but nothing inside it is editable. A NATIVE template is the opposite —
// the app owns the whole wall:
//
//   • a background PLATE built from the approved style ramp as a live gradient
//     (PDF Shading Type 2/3 in the `.ai`, `linearGradient` in the `.svg`), so
//     no raster is embedded at all;
//   • editable HEADLINE, SUBHEAD, BODY and LOGO slots, all positioned from the
//     trim box, so re-issuing the booth at another stand size re-lays the copy
//     instead of stranding it;
//   • every visible mark exported as live Illustrator vector — copy is outlined
//     paths (never substitutable live text), the lockup is EPS-derived outlines,
//     the plate is a real editable gradient object.
//
// This module holds nothing but data and lookups, and deliberately imports
// nothing from the signage graph, so `next-london-signage.ts` can consult it
// while building its own booth panels.

/** The editable copy a native booth template ships with. */
export type NativeBoothTemplate = {
  /** Booth slug — the id used by LONDON_BOOTHS and the booth_templates row. */
  slug: string;
  /** Approved style ramp painted as the background plate. */
  plateStyle: string;
  /** Default headline. Empty string = no headline. */
  headline: string;
  /** Default subhead under the headline. */
  sub: string;
  /** Default body paragraph, wrapped to the live area. */
  body: string;
  /** Short human note shown in the booth template editor. */
  note: string;
};

/**
 * Native booths, keyed by slug. Every partner booth is now built by us: a
 * brand plate plus editable headline, subhead, body and logo slots, with copy
 * written for that stand's own subject.
 */
export const NATIVE_BOOTH_TEMPLATES: NativeBoothTemplate[] = [
  {
    slug: "global-content-delivery-tradebooth-a",
    plateStyle: "01-beam-violet-aqua",
    headline: "GLOBAL CONTENT DELIVERY",
    sub: "ONE PIPELINE, EVERY MARKET",
    body:
      "Translation, review and publication in a single governed workflow — " +
      "so every market launches from the same approved source, on the same day.",
    note: "Native template: plate plus editable headline, subhead, body and logo slots.",
  },
  {
    slug: "ti-tradebooth-a",
    plateStyle: "07-prism-sweep",
    headline: "TRIAL INTERACTIVE",
    sub: "THE eTMF BUILT FOR INSPECTION DAY",
    body:
      "Study start-up, document exchange and inspection readiness in one validated " +
      "platform — with every filing traceable from site to sponsor.",
    note: "Native template: Trial Interactive lockup only, never the TransPerfect mark.",
  },
  {
    slug: "gl-live-tradebooth-a",
    plateStyle: "03-wash-diagonal",
    headline: "GLOBALLINK LIVE",
    sub: "CONFERENCES & EVENTS IN EVERY LANGUAGE",
    body:
      "Live interpretation, captioning and remote participation for meetings of any " +
      "size — booked, staffed and delivered as one managed service.",
    note: "Native template: plate plus editable headline, subhead, body and logo slots.",
  },
  {
    slug: "global-digital-experience-tradebooth-a",
    plateStyle: "05-bloom-corner",
    headline: "GLOBAL DIGITAL EXPERIENCE",
    sub: "EVERY MARKET, THE SAME BRAND",
    body:
      "Websites, campaigns and product journeys localised in place — connected to " +
      "your CMS so regional teams publish without rebuilding a single page.",
    note: "Native template: plate plus editable headline, subhead, body and logo slots.",
  },
  {
    slug: "learning-tradebooth-a",
    plateStyle: "09-dawn",
    headline: "LEARNING SOLUTIONS",
    sub: "TRAINING THAT TRAVELS",
    body:
      "Courses, assessments and compliance training adapted for every region — " +
      "voice, video and interaction rebuilt for the local learner, not subtitled.",
    note: "Native template: plate plus editable headline, subhead, body and logo slots.",
  },
  {
    slug: "live-customer-tradebooth-a",
    plateStyle: "10-veil",
    headline: "CUSTOMER CONNECT UNIVERSITY",
    sub: "SKILLS FOR THE TEAMS ON THE FRONT LINE",
    body:
      "Practical, role-based programmes for support and service teams — built on the " +
      "conversations your customers are actually having.",
    note: "Native template: plate plus editable headline, subhead, body and logo slots.",
  },
  {
    slug: "media-tradebooth-a",
    plateStyle: "04-horizon",
    headline: "MEDIA SOLUTIONS",
    sub: "DUBBING, SUBTITLING, ACCESSIBILITY",
    body:
      "Studios, voice talent and post production under one roof — episodic and " +
      "feature content delivered to platform spec in every release market.",
    note: "Native template: plate plus editable headline, subhead, body and logo slots.",
  },
  {
    slug: "legal-support-2-tradebooth-b",
    plateStyle: "08-chevron-sweep",
    headline: "LEGAL SUPPORT",
    sub: "eDISCOVERY AND CERTIFIED TRANSLATION",
    body:
      "Multilingual review, forensic collection and certified filings — handled by " +
      "legal specialists on infrastructure built for privilege and chain of custody.",
    note: "Native template: plate plus editable headline, subhead, body and logo slots.",
  },
  {
    slug: "sterling-2-tradebooth-a",
    plateStyle: "12-repeat-wash",
    headline: "STERLING",
    sub: "BACKGROUND SCREENING AT GLOBAL SCALE",
    body:
      "Identity, credential and compliance checks run consistently across borders — " +
      "so hiring moves at one speed wherever the role sits.",
    note: "Native template: partner stand — confirm partner mark usage before publishing.",
  },
  {
    slug: "veeva-tradebooth-a",
    plateStyle: "11-brew-diagonal",
    headline: "VEEVA",
    sub: "CONNECTED CONTENT FOR LIFE SCIENCES",
    body:
      "Vault-native workflows joined to global language operations — approved assets " +
      "reaching every affiliate without a second review cycle.",
    note: "Native template: partner stand — confirm partner mark usage before publishing.",
  },
  {
    slug: "contact-center",
    plateStyle: "04-horizon",
    headline: "CONTACT CENTER",
    sub: "PATIENT AND CUSTOMER SUPPORT, 24/7",
    body:
      "Multilingual agents, intake and adverse-event handling — trained on your " +
      "protocols and reporting into your systems from day one.",
    note: "Native template: LifeSciNEXT stand.",
  },
  {
    slug: "coa",
    plateStyle: "01-beam-violet-aqua",
    headline: "CLINICAL OUTCOME ASSESSMENTS",
    sub: "LINGUISTIC VALIDATION DONE PROPERLY",
    body:
      "COA licensing, translation and cognitive debriefing to ISPOR practice — " +
      "documented for submission in every participating country.",
    note: "Native template: LifeSciNEXT stand.",
  },
  {
    slug: "medical-writing",
    plateStyle: "09-dawn",
    headline: "MEDICAL WRITING",
    sub: "FROM PROTOCOL TO PUBLICATION",
    body:
      "Regulatory, clinical and scientific documents written by qualified authors — " +
      "consistent across a programme, ready for submission and for peer review.",
    note: "Native template: LifeSciNEXT stand.",
  },
  {
    slug: "live-conference-events",
    plateStyle: "03-wash-diagonal",
    headline: "LIVE CONFERENCE & EVENTS",
    sub: "INVESTIGATOR MEETINGS THAT RUN CLEAN",
    body:
      "Interpretation, staging and on-site language support for advisory boards and " +
      "investigator meetings — planned with your medical and compliance teams.",
    note: "Native template: LifeSciNEXT stand.",
  },
  {
    slug: "commercial-life-sciences",
    plateStyle: "08-chevron-sweep",
    headline: "COMMERCIAL FOR LIFE SCIENCES",
    sub: "LAUNCH IN EVERY MARKET AT ONCE",
    body:
      "Promotional material, MLR review and omnichannel assets localised under one " +
      "governance model — so a launch date means the same thing everywhere.",
    note: "Native template: LifeSciNEXT stand.",
  },
];

const BY_SLUG = new Map(NATIVE_BOOTH_TEMPLATES.map((t) => [t.slug, t]));

/** True when this booth is built by the app rather than supplied by a vendor. */
export function isNativeBoothSlug(slug: string | null | undefined): boolean {
  return !!slug && BY_SLUG.has(slug);
}

/** The native template for a booth slug, or null for a supplied wall. */
export function nativeBoothTemplate(slug: string | null | undefined): NativeBoothTemplate | null {
  return (slug && BY_SLUG.get(slug)) || null;
}

/** The style ramp a native booth's plate is painted from. */
export function nativeBoothPlateStyle(slug: string | null | undefined): string | null {
  return nativeBoothTemplate(slug)?.plateStyle ?? null;
}
