// Curated library of example video slides — one per variant that supports
// slide-level video (see variant-media.ts VIDEO_VARIANT_IDS). Each example
// is a fully-populated `content` object with TransPerfect-appropriate copy
// plus external `videoUrl` and `videoPosterUrl` values from the public
// Google GTV sample bucket (stable, long-lived, no expiry).
//
// External URLs deliberately have no `videoPath` / `videoPosterPath` — per
// our convention, path-based re-signing is only for our own private
// storage buckets. QA is clean because every example ships a poster still.
//
// Rendered as thumbnails in the deck editor's "Video examples" picker.
// Inserting deep-clones the content via structuredClone and routes through
// the normal `insertExampleSlide` deck-store action, so
// normalizeSlideMedia and variant-swap invariants still apply.

// Stable public sample host — W3C media samples. Google's former
// `gtv-videos-bucket` public alias now returns 403, so we cycle across a
// handful of long-lived W3C mp4/poster pairs. Every clip has a matching
// poster PNG at the same path.
const W3 = "https://media.w3.org/2010/05";
const CLIPS = [
  { v: `${W3}/sintel/trailer.mp4`, p: `${W3}/sintel/poster.png` },
  { v: `${W3}/bunny/trailer.mp4`, p: `${W3}/bunny/poster.png` },
  { v: `${W3}/bunny/movie.mp4`, p: `${W3}/bunny/poster.png` },
  { v: `${W3}/video/movie_300.mp4`, p: `${W3}/video/poster.png` },
] as const;
const clip = (i: number) => CLIPS[i % CLIPS.length];

export type VideoSlideExample = {
  key: string;
  variantId: string;
  title: string;
  blurb: string;
  content: Record<string, unknown>;
};

export const VIDEO_SLIDE_EXAMPLES: VideoSlideExample[] = [
  {
    key: "cover-media-global-ops",
    variantId: "MV-OP-COVER-MEDIA",
    title: "Cover · Global Operations",
    blurb: "Full-bleed cinematic cover with a motion backdrop — ideal for opening a global-operations narrative.",
    content: {
      kicker: "Global Operations · 2026",
      title: "Localization at the speed of your business.",
      subtitle: "170+ languages, 24/7 human + AI orchestration.",
      prospect: "TransPerfect",
      date: "January 2026",
      videoUrl: `${GTV}/ElephantsDream.mp4`,
      videoPosterUrl: `${GTV}/images/ElephantsDream.jpg`,
    },
  },
  {
    key: "cover-editorial-launch",
    variantId: "MV-OP-COVER-EDITORIAL",
    title: "Cover · Editorial Launch",
    blurb: "Editorial hero with kicker + oversized headline over ambient motion — for keynote and campaign kick-offs.",
    content: {
      kicker: "Client Kick-off",
      title: "A single partner for every market you enter.",
      subtitle: "One workflow, one QA layer, one accountable team.",
      dateline: "TransPerfect · Q1 2026",
      videoUrl: `${GTV}/Sintel.mp4`,
      videoPosterUrl: `${GTV}/images/Sintel.jpg`,
    },
  },
  {
    key: "cover-split-partnership",
    variantId: "MV-OP-COVER-SPLIT",
    title: "Cover · Split Partnership",
    blurb: "Split hero — copy on one side, motion panel on the other. Great for opening a co-branded pitch.",
    content: {
      kicker: "Strategic Partnership",
      title: "Built for regulated industries at global scale.",
      subtitle: "Life sciences, legal, finance — with the certifications to prove it.",
      prospect: "Prospect Ltd.",
      videoUrl: `${GTV}/TearsOfSteel.mp4`,
      videoPosterUrl: `${GTV}/images/TearsOfSteel.jpg`,
    },
  },
  {
    key: "img-full-bleed-vision",
    variantId: "MV-IMG-FULL-BLEED",
    title: "Image · Full-Bleed Vision",
    blurb: "Edge-to-edge motion with a small overlay caption — for vision statements and section dividers.",
    content: {
      title: "Everywhere your customer is.",
      caption: "24 offices · 90 countries · one operating model.",
      videoUrl: `${GTV}/ForBiggerBlazes.mp4`,
      videoPosterUrl: `${GTV}/images/ForBiggerBlazes.jpg`,
    },
  },
  {
    key: "img-split-workflow",
    variantId: "MV-IMG-SPLIT",
    title: "Image · Split Workflow",
    blurb: "50/50 split — narrative copy alongside a looping process shot. Best for workflow or capability slides.",
    content: {
      kicker: "How it works",
      title: "One orchestration layer. Every content type.",
      body: "Ingest, translate, review, and publish through a single API — human linguists in the loop where regulation requires it.",
      videoUrl: `${GTV}/ForBiggerJoyrides.mp4`,
      videoPosterUrl: `${GTV}/images/ForBiggerJoyrides.jpg`,
    },
  },
  {
    key: "img-caption-scale",
    variantId: "MV-IMG-CAPTION",
    title: "Image · Caption at Scale",
    blurb: "Motion panel with a supporting caption block — for proof points about volume, speed, or reach.",
    content: {
      title: "Localization at scale, without the seams.",
      caption:
        "Billions of words a year, delivered against SLAs that regulated buyers actually accept.",
      credit: "Source · TransPerfect internal 2025",
      videoUrl: `${GTV}/ForBiggerEscapes.mp4`,
      videoPosterUrl: `${GTV}/images/ForBiggerEscapes.jpg`,
    },
  },
  {
    key: "img-portrait-leader",
    variantId: "MV-IMG-PORTRAIT",
    title: "Image · Portrait Leader",
    blurb: "Portrait-oriented motion frame with name + role — for leadership intros and case-lead spotlights.",
    content: {
      name: "Alex Rivera",
      role: "Global Program Director",
      quote:
        "The bar is simple: our clients should never have to choose between speed and quality.",
      videoUrl: `${GTV}/ForBiggerMeltdowns.mp4`,
      videoPosterUrl: `${GTV}/images/ForBiggerMeltdowns.jpg`,
    },
  },
  {
    key: "img-quote-bg-client",
    variantId: "MV-IMG-QUOTE-BG",
    title: "Image · Client Quote",
    blurb: "Client quote layered over an ambient motion background — for testimonial and proof moments.",
    content: {
      quote:
        "TransPerfect became the localization backbone for every product launch we run — no exceptions.",
      attribution: "VP, Global Marketing · Fortune 100 Life Sciences",
      videoUrl: `${GTV}/ForBiggerFun.mp4`,
      videoPosterUrl: `${GTV}/images/ForBiggerFun.jpg`,
    },
  },
];

export const VIDEO_EXAMPLE_VARIANT_IDS: ReadonlySet<string> = new Set(
  VIDEO_SLIDE_EXAMPLES.map((e) => e.variantId),
);
