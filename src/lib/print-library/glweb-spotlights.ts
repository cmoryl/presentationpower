// GlobalLink Web — recreated client spotlight library.
//
// Sources: the GlobalLink Web retail and travel spotlight PDFs (vVardis, BALR.,
// Barry's Bootcamp, Discover The Palm Beaches, Heathrow). Copy was transcribed
// from the originals and re-shaped into the live `SpotlightContent` model; hero
// art is re-hosted on the CDN.
//
// Read-only seeds. "Create editable copy" writes one into `print_assets` for the
// signed-in user via createPrintAsset().

import type { SpotlightContent } from "@/lib/print-assets.types";

import heroVvardis from "@/assets/print-heroes/glweb/glweb-vvardis-oral-care-global-localization.jpg.asset.json";
import heroBalr from "@/assets/print-heroes/glweb/glweb-balr-luxury-lifestyle-online-sales.jpg.asset.json";
import heroBarrys from "@/assets/print-heroes/glweb/glweb-barrys-nine-languages-one-month.jpg.asset.json";
import heroPalmBeaches from "@/assets/print-heroes/glweb/glweb-discover-palm-beaches-15000-pages.jpg.asset.json";
import heroHeathrow from "@/assets/print-heroes/glweb/glweb-heathrow-multilingual-transformation.jpg.asset.json";

export const GLWEB_SPOTLIGHT_DIVISION_ID = "bm-product";

/** Shelf grouping — nests under Product → GlobalLink → GlobalLink Web. */
export const GLWEB_COLLECTION = "GlobalLink Web";

export type GlWebSpotlightSeed = {
  slug: string;
  title: string;
  /** Short shelf blurb — not part of the printed asset. */
  teaser: string;
  collection: string;
  tags: string[];
  sourceFile: string;
  content: SpotlightContent;
};

const CTA = { label: "Talk to GlobalLink Web", url: "https://globallink.transperfect.com/products/globallink-web" };

const EXPERT = {
  name: "GlobalLink Web",
  role: "Website localization",
  email: "globallink@transperfect.com",
};

export const GLWEB_SPOTLIGHTS: GlWebSpotlightSeed[] = [
  {
    slug: "vvardis-oral-care-global-localization",
    title: "Revolutionizing Oral Care Globally: vVardis' Localization Success",
    teaser:
      "A science-led wellness brand localized its storefronts with GlobalLink Web — and now takes over 30% of sales from global markets.",
    collection: GLWEB_COLLECTION,
    tags: ["globallink web", "website localization", "retail", "e-commerce", "wellness"],
    sourceFile: "TPT_GlobalLink_Retail_vVardis_Spotlight.pdf",
    content: {
      eyebrow: "Client spotlight",
      productName: "GlobalLink Web",
      tagline: "Expansion through localization for a global oral-care innovator",
      summary:
        "vVardis, a global wellness brand driven by scientific innovation, understands the significance of emerging markets for their growth. To expedite their 'expansion through localization' objectives, they harnessed GlobalLink Web to localize their websites for multiple markets.",
      capabilities: [
        {
          heading: "No in-house resources required",
          body: "GlobalLink Web handled the technology and translation workflow, so the vVardis team could make effortless updates to in-language content without adding headcount.",
        },
        {
          heading: "Multiple markets, one source of truth",
          body: "Websites were localized for several target markets at once, keeping product science, claims, and campaign copy consistent everywhere.",
        },
        {
          heading: "Personalized in-language shopping",
          body: "Shoppers browse and buy in their preferred language, letting vVardis communicate its science-backed products the way each market expects.",
        },
        {
          heading: "Built for continued growth",
          body: "With multilingual support live, new locales and content updates publish continuously rather than as one-off projects.",
        },
      ],
      stats: [
        { label: "Sales from global markets", value: "30", unit: "%+", caption: "Since multilingual launch" },
        { label: "In-house resources needed", value: "0", caption: "Fully managed by GlobalLink Web" },
        { label: "Customer engagement", value: "Remarkable growth", caption: "Post-localization" },
      ],
      quote: {
        text: "The engagement and conversion we have seen from global markets is a testament to GlobalLink Web's role in allowing us to provide a personalized, in-language shopping experience to any customer anywhere in the world.",
        author: "Operation Consultant",
        company: "vVardis",
      },
      expert: EXPERT,
      cta: CTA,
      heroMedia: { imageUrl: heroVvardis.url, aspect: "fill", heightPct: 38, focalY: 45 },
    },
  },
  {
    slug: "balr-luxury-lifestyle-online-sales",
    title: "BALR. Boosts Online Sales by 88% with GlobalLink Web",
    teaser:
      "Four languages, one bespoke deployment — an 88% lift in transactions and a 21% drop in bounce rate for a luxury lifestyle brand.",
    collection: GLWEB_COLLECTION,
    tags: ["globallink web", "website localization", "retail", "e-commerce", "luxury"],
    sourceFile: "TPT_Retail_Spotlight_BALR..pdf",
    content: {
      eyebrow: "Client spotlight",
      productName: "GlobalLink Web",
      tagline: "Expansion through localization for an international luxury lifestyle brand",
      summary:
        "As an international luxury lifestyle brand, BALR. knows that being at the forefront of emerging markets is essential to growth. GlobalLink Web offered a bespoke solution that didn't take up any in-house resources while allowing for simple updates to in-language content.",
      capabilities: [
        {
          heading: "Bespoke deployment",
          body: "GlobalLink Web was configured around BALR.'s existing storefront rather than forcing a replatform or a parallel site build.",
        },
        {
          heading: "Four languages live",
          body: "The site was translated into four languages, extending the brand voice into each priority market.",
        },
        {
          heading: "Simple in-language updates",
          body: "Drops, campaigns, and product copy update in every language without engineering tickets or manual exports.",
        },
        {
          heading: "Consultancy plus turnaround",
          body: "Quick turnaround times and hands-on consultancy moved BALR. through its localization roadmap in large steps.",
        },
      ],
      stats: [
        { label: "Increase in transactions", value: "88", unit: "%" },
        { label: "Increase in conversion rate", value: "75", unit: "%" },
        { label: "Reduction in bounce rate", value: "21", unit: "%" },
        { label: "Languages launched", value: "4" },
      ],
      quote: {
        text: "Scale-ups like BALR. need tech partners that set us up for future growth. TransPerfect is one of those partners. With quick turnaround times and effective consultancy they helped us take massive steps on our localization roadmap.",
        author: "Thomas van Mastbergen",
        role: "Head of Digital",
        company: "BALR.",
      },
      expert: EXPERT,
      cta: CTA,
      heroMedia: { imageUrl: heroBalr.url, aspect: "fill", heightPct: 38, focalY: 50 },
    },
  },
  {
    slug: "barrys-nine-languages-one-month",
    title: "Barry's Launches Its Website in Nine Languages in One Month",
    teaser:
      "Heavily branded fitness content localized into nine languages on an aggressive deadline — launched on time.",
    collection: GLWEB_COLLECTION,
    tags: ["globallink web", "website localization", "fitness", "retail", "speed to market"],
    sourceFile: "TPT_Retail_Spotlight_BarrysBootcamp.pdf",
    content: {
      eyebrow: "Client spotlight",
      productName: "GlobalLink Web",
      tagline: "Nine languages, one month, zero brand compromise",
      summary:
        "To better support their many international studios and rapidly growing global footprint, Barry's needed to launch their new website in nine languages quickly. With a tight deadline and creative, heavily branded content, Barry's leveraged TransPerfect's language services and the GlobalLink Web solution.",
      capabilities: [
        {
          heading: "Aggressive timeline absorbed",
          body: "The nine-language launch was delivered inside a one-month window without pushing the site date.",
        },
        {
          heading: "Brand-true creative",
          body: "Heavily branded, creative copy was adapted by linguists briefed on Barry's tone — deliverables stayed true to the brand.",
        },
        {
          heading: "Language services plus technology",
          body: "GlobalLink Web handled extraction, publishing, and updates while TransPerfect linguists handled the craft.",
        },
        {
          heading: "Budget-aware options",
          body: "The team stayed open to exploring options that met both the budget and the timeline.",
        },
      ],
      stats: [
        { label: "Languages launched", value: "9" },
        { label: "Time to launch", value: "1", unit: " month" },
        { label: "On-time delivery", value: "100", unit: "%" },
      ],
      quote: {
        text: "TransPerfect has proven to be a valuable partner—knowledgeable, responsive, and always open to exploring options to meet our budget and aggressive timelines. They produced high-quality deliverables, on time, that stayed true to our brand, which is at the forefront of everything we do.",
        author: "Head of Digital",
        company: "Barry's",
      },
      expert: EXPERT,
      cta: CTA,
      heroMedia: { imageUrl: heroBarrys.url, aspect: "fill", heightPct: 38, focalY: 50 },
    },
  },
  {
    slug: "discover-palm-beaches-15000-pages",
    title: "TransPerfect Translates 15,000 Webpages for Discover The Palm Beaches",
    teaser:
      "A 5,000-page tourism site localized into Spanish, Portuguese, and German with a hybrid AI plus human workflow.",
    collection: GLWEB_COLLECTION,
    tags: ["globallink web", "website localization", "travel", "tourism", "ai translation"],
    sourceFile: "TPT_Travel_Spotlight_Discover Palm Beach.pdf",
    content: {
      eyebrow: "Client spotlight",
      productName: "GlobalLink Web",
      tagline: "Continuous AI-assisted localization for a destination marketing organization",
      summary:
        "Discover The Palm Beaches, the official tourism marketing organization for Palm Beach County, Florida, leveraged GlobalLink Web and an innovative AI solution to translate their award-winning 5,000-page English site into Spanish, Portuguese, and German.",
      capabilities: [
        {
          heading: "Hybrid routing",
          body: "New content was automatically routed to TransPerfect's proprietary AI engines for translation, with human oversight where it mattered.",
        },
        {
          heading: "Dynamic publishing",
          body: "Translated content was placed back on the localized sites dynamically — no manual re-import, no separate site builds.",
        },
        {
          heading: "Scale without headcount",
          body: "15,000 translated webpages across three languages were delivered from a single 5,000-page source site.",
        },
        {
          heading: "Continually improving experience",
          body: "The result is a continually improving online experience for Spanish, Portuguese, and German site visitors.",
        },
      ],
      stats: [
        { label: "Webpages translated", value: "15,000" },
        { label: "Source pages localized", value: "5,000" },
        { label: "Languages live", value: "3", caption: "Spanish, Portuguese, German" },
      ],
      quote: {
        text: "In a manner that's both cost-effective and low maintenance, TransPerfect's GlobalLink Web technology and AI solution have improved our users' online experience by allowing us to speak to them in their native language.",
        author: "Senior Vice President, Marketing",
        company: "Discover The Palm Beaches",
      },
      expert: EXPERT,
      cta: CTA,
      heroMedia: { imageUrl: heroPalmBeaches.url, aspect: "fill", heightPct: 38, focalY: 50 },
    },
  },
  {
    slug: "heathrow-multilingual-transformation",
    title: "Elevating Heathrow's Digital Experience: A Seamless Multilingual Transformation",
    teaser:
      "Five new market sites integrated with Adobe Experience Manager — and a 300% increase in user traffic from those markets.",
    collection: GLWEB_COLLECTION,
    tags: ["globallink web", "website localization", "travel", "aviation", "adobe experience manager"],
    sourceFile: "TPT_Travel_Spotlight_Heathrow.pdf",
    content: {
      eyebrow: "Client spotlight",
      productName: "GlobalLink Web",
      tagline: "From information hub to multilingual, revenue-generating platform",
      summary:
        "As the UK's largest airport and the world's second busiest by passenger traffic, Heathrow needed to transform its website and digital channels from a basic information hub into a multifaceted, revenue-generating platform — with parking, fast-track security, lounge access, duty-free, and currency exchange purchasable in native languages.",
      capabilities: [
        {
          heading: "The problem",
          body: "Heathrow's digital presence had to serve a global audience and make integrated airport services purchasable in native languages across multilingual markets.",
        },
        {
          heading: "Integrated with Adobe Experience Manager",
          body: "GlobalLink technology was integrated with AEM so content could flow seamlessly for translation, in collaboration with Sapient, Heathrow's system integration agency.",
        },
        {
          heading: "Blended translation levels",
          body: "TransPerfect consulted on the optimal translation level per market, adopting full human, AI, and hybrid workflows based on audience, traffic, and content value.",
        },
        {
          heading: "The results",
          body: "Heathrow launched Spanish, German, Italian, Swedish, and Simplified Chinese sites, with a lower upfront investment while reaching more markets — plus a significant reduction in bounce and exit rates and a substantial rise in revenue from website purchases.",
        },
      ],
      stats: [
        { label: "Increase in user traffic", value: "300", unit: "%", caption: "From the new markets" },
        { label: "Markets launched", value: "5", caption: "ES, DE, IT, SV, ZH-Hans" },
        { label: "Bounce & exit rates", value: "Down", caption: "Significant reduction" },
        { label: "Upfront investment", value: "Lower", caption: "Budget optimized by workflow tiering" },
      ],
      quote: {
        text: "TransPerfect's analytical approach was able to align our budget and goals while delivering the most languages to support our growing international audience. Their partnership with Adobe and collaboration with Sapient, our system integration agency, meant the project was a huge success.",
        author: "Steven Glenfield",
        company: "Heathrow",
      },
      expert: EXPERT,
      cta: CTA,
      heroMedia: { imageUrl: heroHeathrow.url, aspect: "fill", heightPct: 38, focalY: 40 },
    },
  },
];
