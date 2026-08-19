// GlobalLink Web — recreated guide / playbook / checklist library.
//
// Sources: the GlobalLink Web marketing collateral set (AI in Localization,
// Manual vs. Automated, retail and travel playbooks, GenAI solutions, SEO and
// market-readiness checklists, executive buy-in guide, success infographic,
// search-engine-by-region chart). Copy was transcribed from the originals and
// re-shaped into the live `EBrochureContent` model; hero art is re-hosted on the
// CDN.
//
// Read-only seeds. "Create editable copy" writes one into `print_assets` for the
// signed-in user via createPrintAsset().

import type { EBrochureContent } from "@/lib/print-assets.types";

import heroAi from "@/assets/print-heroes/glweb/glweb-ai-in-localization-how-to-win.jpg.asset.json";
import heroManual from "@/assets/print-heroes/glweb/glweb-manual-vs-automated-localization.jpg.asset.json";
import heroRetailCompilation from "@/assets/print-heroes/glweb/glweb-retail-brands-engage-audiences.jpg.asset.json";
import heroSuccess from "@/assets/print-heroes/glweb/glweb-powering-multilingual-success-stories.jpg.asset.json";
import heroGenAi from "@/assets/print-heroes/glweb/glweb-top-5-genai-solutions-global-website.jpg.asset.json";
import heroSearchEngines from "@/assets/print-heroes/glweb/glweb-top-search-engines-by-region.jpg.asset.json";
import heroMarketers from "@/assets/print-heroes/glweb/glweb-web-localization-playbook-marketers.jpg.asset.json";
import heroSeoChecklist from "@/assets/print-heroes/glweb/glweb-multilingual-seo-success-checklist.jpg.asset.json";
import heroCrossBorder from "@/assets/print-heroes/glweb/glweb-cross-border-market-expansion-readiness.jpg.asset.json";
import heroBuyIn from "@/assets/print-heroes/glweb/glweb-multilingual-websites-executive-buy-in.jpg.asset.json";
import heroConsiderations from "@/assets/print-heroes/glweb/glweb-website-localization-playbook-considerations.jpg.asset.json";
import heroRetailReport from "@/assets/print-heroes/glweb/glweb-leading-retailers-global-ecommerce.jpg.asset.json";
import heroTravel from "@/assets/print-heroes/glweb/glweb-web-localization-playbook-travel.jpg.asset.json";

export const GLWEB_EBRO_DIVISION_ID = "bm-product";

/** Shelf grouping — nests under Product → GlobalLink → GlobalLink Web. */
export const GLWEB_EBRO_COLLECTION = "GlobalLink Web";

export type GlWebEbrochureSeed = {
  slug: string;
  title: string;
  /** Short shelf blurb — not part of the printed asset. */
  teaser: string;
  tags: string[];
  collection: string;
  sourceFile: string;
  content: EBrochureContent;
};

const CTA = {
  label: "Get GlobalLink Web",
  subhead: "globallinkweb.com/get-glweb — globallink@transperfect.com",
  url: "https://globallink.transperfect.com/products/globallink-web",
};

const hero = (url: string, heightPct = 40, focalY = 50): EBrochureContent["heroMedia"] => ({
  imageUrl: url,
  aspect: "fill",
  heightPct,
  focalY,
});

const BASE_TAGS = ["globallink web", "website localization", "web"];

export const GLWEB_EBROCHURES: GlWebEbrochureSeed[] = [
  {
    slug: "ai-in-localization-how-to-win",
    title: "AI in Localization: How to Win, Mitigate Risk, and Capture ROI",
    teaser:
      "What marketing executives need to know about AI, automation, and localization success.",
    tags: [...BASE_TAGS, "ai", "machine translation", "roi"],
    collection: GLWEB_EBRO_COLLECTION,
    sourceFile: "GL_AI in Localization How to Win 1.pdf",
    content: {
      eyebrow: "Guide",
      title: "AI in Localization: How to Win, Mitigate Risk, and Capture ROI",
      summary:
        "Global websites require fast, accurate, and scalable localization across dozens of markets. AI and machine translation can meet that demand — when used strategically. This guide separates real results from costly missteps.",
      sections: [
        {
          heading: "The opportunity",
          body: "From product pages and legal disclaimers to SEO content and UX copy, the demand to localize more content, more quickly, keeps growing while teams work under tight timelines with limited internal resources. AI and MT let teams localize faster, at scale, and across more languages with less manual effort.",
          bullets: [
            "Speed and scale across support articles, product copy, and UX strings",
            "Strong quality in high-resource languages such as Spanish, French, and German",
            "Easy expansion into new markets and languages",
          ],
        },
        {
          heading: "The risks",
          body: "The risks are just as real as the gains. Poor translation quality, SEO penalties, and compliance issues can quickly erase the benefits — and AI performance varies sharply by language and content type.",
          bullets: [
            "AI performs well in structurally simple languages, weaker in Japanese or complex morphologies",
            "Unreviewed source errors multiply once translated, raising editing costs",
            "SEO penalties and compliance exposure from unmanaged output",
          ],
        },
        {
          heading: "Turning insight into action",
          body: "Combine AI with human expertise, build a scalable localization strategy that protects the brand, and track the ROI of multilingual SEO by monitoring organic rankings, traffic, and engagement across languages.",
          bullets: [
            "Tier workflows: raw MT, AI + post-edit, and full human by content value",
            "Centralize translation memory and terminology",
            "Measure impact per language, not just in aggregate",
          ],
        },
      ],
      stats: [
        { label: "eCommerce SKUs localized with AI", value: "1M", unit: "+", caption: "Single retailer program" },
        { label: "Languages in a multilingual UX rollout", value: "20", unit: "+" },
        { label: "Support content instantly translated", value: "15", unit: " languages" },
        { label: "Reduction in time-to-market", value: "40", unit: "%", caption: "New feature launches" },
      ],
      discover: {
        body: "Inside the guide",
        bullets: [
          "AI & website localization in 2025: the opportunity and risks",
          "The wins: what is working in AI-powered localization",
          "The risks: hidden pitfalls that harm AI localization efforts",
          "How to build a smarter AI localization strategy",
          "Future-proofing your website localization strategy",
        ],
      },
      cta: CTA,
      heroMedia: hero(heroAi.url, 40, 45),
    },
  },
  {
    slug: "manual-vs-automated-localization",
    title: "Manual vs. Automated Localization",
    teaser:
      "A side-by-side walk through the localization journey — from tech setup to translation updates.",
    tags: [...BASE_TAGS, "automation", "workflow", "comparison"],
    collection: GLWEB_EBRO_COLLECTION,
    sourceFile: "GL_GL Web_Manual vs Auto Trans.pdf",
    content: {
      eyebrow: "Comparison",
      title: "Manual vs. Automated Localization",
      summary:
        "See how GlobalLink Web simplifies your localization journey — every step that manual website localization asks your team to own, handled automatically.",
      sections: [
        {
          heading: "Set-up and extraction",
          body: "Manual localization means standing up your own tech stack, then extracting and preparing website content for translation — a lot of time and effort before a single word is translated.",
          bullets: [
            "Manual: set up tech from scratch",
            "GlobalLink Web: set up for you, no tech headaches",
            "Content automatically extracted and ready for translation",
          ],
        },
        {
          heading: "Prep, analysis, and management",
          body: "File prep and analysis is time-consuming and error-prone by hand, and coordinating translators means constant back-and-forth. GlobalLink Web analyzes files instantly and tracks progress automatically in real time.",
          bullets: [
            "Files analyzed instantly with no manual prep",
            "Real-time progress tracking, no manual coordination",
            "Fewer handoffs, fewer errors",
          ],
        },
        {
          heading: "Re-import, testing, and updates",
          body: "Manual workflows require uploading translated content and testing every version for errors, then repeating for every update. GlobalLink Web uploads and tests automatically and pushes translation updates in real time.",
          bullets: [
            "Content uploaded and tested automatically",
            "Translations updated in real time with no manual effort",
            "Seamless localization as your site keeps changing",
          ],
        },
      ],
      stats: [
        { label: "Manual effort removed", value: "90", unit: "%" },
        { label: "Journey steps automated", value: "6", caption: "Setup through updates" },
        { label: "Progress tracking", value: "Real time" },
        { label: "In-house tech required", value: "None" },
      ],
      discover: {
        body: "Why teams switch",
        bullets: [
          "No technology to build or maintain",
          "Automatic content extraction and re-import",
          "Instant analysis instead of manual file prep",
          "Real-time translation updates as content changes",
        ],
      },
      cta: CTA,
      heroMedia: hero(heroManual.url, 34, 50),
    },
  },
  {
    slug: "retail-brands-engage-audiences",
    title: "Reaching Target Markets: How Retail Brands Engage Audiences with Website Localization",
    teaser:
      "A step-by-step guide to attracting and retaining shoppers, with retail proof points from Lavazza and BALR.",
    tags: [...BASE_TAGS, "retail", "e-commerce", "roi"],
    collection: GLWEB_EBRO_COLLECTION,
    sourceFile: "GL_Retail Compilation_Dec2024_V2.pdf",
    content: {
      eyebrow: "Guide",
      title: "How Retail Brands Engage Audiences with Website Localization",
      summary:
        "For retail brands trying to increase revenue and build stronger brand loyalty, a well-localized digital experience is essential. This guide explores how retail website localization drives measurable ROI, with real-world stories from brands scaling their global presence with GlobalLink Web.",
      sections: [
        {
          heading: "A seamless multilingual shopping experience",
          body: "Connect with international shoppers at every touchpoint — discovery, product detail, checkout, service emails, and loyalty programs — using a centralized platform to manage updates across every language.",
          bullets: [
            "76% of online shoppers prefer to buy with information in their native language",
            "40% will never purchase from websites in other languages",
            "6.4 billion people use languages other than English",
          ],
        },
        {
          heading: "The ROI of translating your website",
          body: "Key statistics to make the business case for website translation internally — localization lifts conversion, retention, and lifetime value, not just reach.",
          bullets: [
            "88% of consumers are more likely to buy from brands that speak their language",
            "75% of customers report higher satisfaction with localized service touchpoints",
            "Localized loyalty programs and emails deepen repeat purchase behavior",
          ],
        },
        {
          heading: "Real-world results",
          body: "Lavazza used GlobalLink Web across markets and 37 languages, cutting localization costs by 47%. BALR. translated its site into four languages and saw an 88% increase in transactions, a 75% conversion lift, and a 21% reduction in bounce rate.",
          bullets: [
            "Lavazza: 47% reduction in localization costs, 37 languages supported",
            "BALR.: 88% more transactions, 75% higher conversion",
            "BALR.: 21% reduction in bounce rate",
          ],
        },
      ],
      stats: [
        { label: "Shoppers preferring native language", value: "76", unit: "%" },
        { label: "Lavazza localization cost cut", value: "47", unit: "%" },
        { label: "BALR. transaction lift", value: "88", unit: "%" },
        { label: "Languages supported by Lavazza", value: "37" },
      ],
      discover: {
        body: "Inside the guide",
        bullets: [
          "Crafting a seamless multilingual shopping experience",
          "The ROI of translating your website",
          "Real-world examples of web localization in retail",
          "Introducing GlobalLink Web",
        ],
      },
      cta: CTA,
      heroMedia: hero(heroRetailCompilation.url, 40, 45),
    },
  },
  {
    slug: "powering-multilingual-success-stories",
    title: "The GlobalLink Advantage: Powering Multilingual Success Stories",
    teaser:
      "An infographic view of how top brands accelerate global expansion with AI-powered website localization.",
    tags: [...BASE_TAGS, "infographic", "ai", "results"],
    collection: GLWEB_EBRO_COLLECTION,
    sourceFile: "GL_Success_Infographic_alternates_23sep2024.pdf",
    content: {
      eyebrow: "Infographic",
      title: "Powering Multilingual Success Stories",
      summary:
        "How top brands accelerate global expansion and enhance web performance with GlobalLink's AI-powered localization.",
      sections: [
        {
          heading: "Increased efficiency",
          body: "AI-powered translation at scale saves time and cost across every market, removing the manual prep, coordination, and re-import work that slows multilingual programs.",
          bullets: [
            "AI-first workflows with human review where it counts",
            "Centralized memory and terminology across markets",
            "Fewer handoffs between marketing, web, and vendors",
          ],
        },
        {
          heading: "Stronger web performance",
          body: "Brands localizing with GlobalLink Web report measurable commerce gains: more transactions, higher conversion, and lower bounce in their new-language markets.",
          bullets: [
            "88% increase in transactions",
            "75% increase in conversion rate",
            "Lower bounce and exit rates in localized markets",
          ],
        },
        {
          heading: "Faster global expansion",
          body: "New markets launch in weeks, not quarters, because the technology handles extraction, publishing, and ongoing updates automatically.",
          bullets: [
            "Launch additional languages without new headcount",
            "Real-time updates keep every locale current",
            "Proven across retail, travel, and enterprise brands",
          ],
        },
      ],
      stats: [
        { label: "Increase in transactions", value: "88", unit: "%" },
        { label: "Increase in conversion rate", value: "75", unit: "%" },
        { label: "Translation approach", value: "AI + human" },
        { label: "Time to new market", value: "Weeks" },
      ],
      cta: CTA,
      heroMedia: hero(heroSuccess.url, 40, 50),
    },
  },
  {
    slug: "top-5-genai-solutions-global-website",
    title: "Top 5 GenAI Solutions to Power a High-Performing Global Website",
    teaser:
      "The actionable guide for marketers who need speed, scale, and multilingual reach — without breaking their CMS.",
    tags: [...BASE_TAGS, "genai", "ai", "content", "accessibility"],
    collection: GLWEB_EBRO_COLLECTION,
    sourceFile: "GL_Top 5 GenAI Solutions to Power a High-Performing Global Website 1.pdf",
    content: {
      eyebrow: "Guide",
      title: "Top 5 GenAI Solutions to Power a High-Performing Global Website",
      summary:
        "Web teams are stretched, under pressure to move faster, prove ROI, and stay on-brand. This guide covers the five generative AI solutions that actually move the needle for global websites.",
      sections: [
        {
          heading: "Content and multimedia at scale",
          body: "Publish on-brand content at scale and localize audio and video without the usual production headaches — generative workflows draft, adapt, and version content per market.",
          bullets: [
            "On-brand content generation across markets",
            "Audio and video localization without heavy studio cycles",
            "Consistent messaging in every language",
          ],
        },
        {
          heading: "Smarter discovery and visual localization",
          body: "Most enterprise websites still rely on legacy search. Generative search answers questions in multiple languages, pulling only from your own site content — and visual localization makes imagery resonate market by market.",
          bullets: [
            "Multilingual, grounded on-site answers from your own content",
            "Fewer dead-end searches and exits",
            "Culturally appropriate imagery per region",
          ],
        },
        {
          heading: "Accessibility and a responsible roadmap",
          body: "Scale inclusive content without sacrificing quality, then adopt a responsible roadmap with built-in checkpoints to assess feasibility, scale, and ROI potential before you expand.",
          bullets: [
            "Alt text, captions, and inclusive copy at scale",
            "Checkpoints for feasibility, scale, and ROI",
            "From possibility to measurable performance",
          ],
        },
      ],
      stats: [
        { label: "GenAI solutions covered", value: "5" },
        { label: "Guide sections", value: "8" },
        { label: "CMS disruption required", value: "None" },
        { label: "Focus", value: "Speed, scale, reach" },
      ],
      discover: {
        body: "The five solutions",
        bullets: [
          "Content generation",
          "Multimedia localization",
          "Smarter discovery with generative on-site search",
          "Visual localization",
          "AI and accessibility",
        ],
      },
      cta: CTA,
      heroMedia: hero(heroGenAi.url, 40, 45),
    },
  },
  {
    slug: "top-search-engines-by-region",
    title: "Top Search Engines by Region",
    teaser:
      "A reference map of the dominant search engines per market — the starting point for regional SEO strategy.",
    tags: [...BASE_TAGS, "seo", "search engines", "reference"],
    collection: GLWEB_EBRO_COLLECTION,
    sourceFile: "GL_Top Search Engines by Region.pdf",
    content: {
      eyebrow: "Reference",
      title: "Top Search Engines by Region",
      summary:
        "Want to optimize your website for global search engines? Google is not the default everywhere — regional engines shape discovery, ranking factors, and technical SEO requirements.",
      sections: [
        {
          heading: "Why the region matters",
          body: "Each market's dominant engine has its own crawler behavior, indexing rules, and ranking factors. Optimizing everything for a single engine leaves organic traffic on the table in the markets you are trying to enter.",
          bullets: [
            "Dominant engine varies sharply by country",
            "Ranking factors and technical requirements differ per engine",
            "Local hosting, markup, and language signals carry different weight",
          ],
        },
        {
          heading: "How to use this chart",
          body: "Map your priority markets against their leading engines, then tailor keyword research, content, and technical SEO to each one instead of duplicating a single playbook.",
          bullets: [
            "Prioritize markets by traffic and revenue potential",
            "Run keyword research in the local engine, not only Google",
            "Adapt metadata and site structure per engine",
          ],
        },
        {
          heading: "Next steps",
          body: "Pair the regional engine map with a multilingual SEO plan: local keyword selection, performance measurement per language, and SEO-friendly deployment of the localized site.",
          bullets: [
            "Download the full SEO guide",
            "Set a baseline ranking grid per language",
            "Choose domain- or folder-based localization deliberately",
          ],
        },
      ],
      stats: [
        { label: "Format", value: "Region map" },
        { label: "Use case", value: "Multilingual SEO" },
        { label: "Pairs with", value: "SEO checklist" },
      ],
      cta: CTA,
      heroMedia: hero(heroSearchEngines.url, 44, 50),
    },
  },
  {
    slug: "web-localization-playbook-marketers",
    title: "The Website Localization Playbook: A Marketer's Guide to Global Growth",
    teaser:
      "Reach audiences faster with high-impact multilingual marketing — strategy, AI + human workflows, SEO, and ROI.",
    tags: [...BASE_TAGS, "marketing", "playbook", "seo", "roi"],
    collection: GLWEB_EBRO_COLLECTION,
    sourceFile: "GL_Web Localization Playbook - Marketers_April2025.pdf",
    content: {
      eyebrow: "Playbook",
      title: "The Website Localization Playbook: A Marketer's Guide to Global Growth",
      summary:
        "Website localization is no longer optional — it is an essential growth strategy. Today's marketers must go beyond translation to create digital experiences that feel native in every market.",
      sections: [
        {
          heading: "The business case",
          body: "Localization drives revenue, engagement, and competitive advantage. Users are over 70% more likely to complete a purchase when engaging with localized content, and 73% of consumers prefer products with information in their native language.",
          bullets: [
            "Over 70% higher purchase completion with localized content",
            "40% will not buy from websites in other languages",
            "52% of websites are in English, yet only 16% of the world speaks it",
          ],
        },
        {
          heading: "AI + humans, and localized SEO",
          body: "Combining AI with human expertise cuts cost and timeline while protecting quality, and multilingual SEO makes that content findable — reducing CPC by up to 40% and improving search visibility per market.",
          bullets: [
            "Localization timelines reduced by 35%",
            "Costs reduced by up to 47% while maintaining quality",
            "CPC reduced by up to 40% through localized organic visibility",
          ],
        },
        {
          heading: "The marketing ROI",
          body: "Enterprises adopting localization at scale experience an average ROI increase of 537% over three years and an average 74% reduction in time-to-market for localized sites, with GlobalLink Web offering three deployment options to fit the business.",
          bullets: [
            "537% average three-year ROI",
            "74% average reduction in time-to-market",
            "Three GlobalLink Web solutions to match your model",
          ],
        },
      ],
      stats: [
        { label: "Average 3-year ROI", value: "537", unit: "%" },
        { label: "Reduction in time-to-market", value: "74", unit: "%" },
        { label: "Localization cost reduction", value: "47", unit: "%" },
        { label: "Consumers preferring native language", value: "73", unit: "%" },
      ],
      discover: {
        body: "Inside the playbook",
        bullets: [
          "The business case for website localization",
          "AI + humans: the smart approach to scalable localization",
          "Cultural adaptation, UX, and content strategy",
          "The role of localized SEO in global marketing success",
          "The three website localization solutions in GlobalLink Web",
        ],
      },
      cta: CTA,
      heroMedia: hero(heroMarketers.url, 40, 45),
    },
  },
  {
    slug: "multilingual-seo-success-checklist",
    title: "Your Multilingual SEO Success Checklist: 5 Essential Steps for Enterprises",
    teaser:
      "Keyword research, cultural accuracy, performance measurement, regional engines, and site structure — in one checklist.",
    tags: [...BASE_TAGS, "seo", "checklist", "enterprise"],
    collection: GLWEB_EBRO_COLLECTION,
    sourceFile: "GL_Your Multilingual SEO Success Checklist 1.pdf",
    content: {
      eyebrow: "Checklist",
      title: "Your Multilingual SEO Success Checklist",
      summary:
        "Multilingual SEO isn't just about translating content — it's about ensuring discoverability, cultural relevance, and technical optimization in every market. Use this checklist to streamline your strategy and drive organic traffic in target regions.",
      sections: [
        {
          heading: "1–2. Identify and refine keywords",
          body: "Conduct keyword research in both source and target languages, then refine for cultural preference and local terminology rather than translating terms literally.",
          bullets: [
            "Align keywords with local search behavior and user intent",
            "Use Google Keyword Planner, Semrush, or Ahrefs for high-impact terms",
            "Collaborate with native speakers or linguists; verify in local engines",
            "Analyze competitor keywords to uncover new opportunities",
          ],
        },
        {
          heading: "3–4. Measure and localize the strategy",
          body: "Set a ranking baseline per language and track results, then adapt to the dominant search engine in each target market.",
          bullets: [
            "Track organic rankings, CTR, and traffic by region",
            "Use Google Search Console, Ahrefs, and Semrush to monitor performance",
            "Identify ranking gaps across markets",
            "Tailor content and technical SEO to each engine's ranking factors",
          ],
        },
        {
          heading: "5. Optimize site structure and translation methodology",
          body: "Deploy the localized site in an SEO-friendly way and keep translation methodology aligned with how each market's engine discovers and indexes content.",
          bullets: [
            "Use domain- or folder-based localization",
            "Keep hreflang, metadata, and sitemaps in sync per locale",
            "Choose AI, hybrid, or human workflows by page value",
          ],
        },
      ],
      stats: [
        { label: "Essential steps", value: "5" },
        { label: "Audience", value: "Enterprise" },
        { label: "Focus", value: "Organic growth" },
      ],
      discover: {
        body: "Use it with",
        bullets: [
          "Top Search Engines by Region",
          "The Website Localization Playbook",
          "GlobalLink Web multilingual SEO deployment options",
        ],
      },
      cta: CTA,
      heroMedia: hero(heroSeoChecklist.url, 38, 30),
    },
  },
  {
    slug: "cross-border-market-expansion-readiness",
    title: "Cross-Border Market Expansion Readiness Checklist",
    teaser:
      "Assess readiness across strategy, expertise, market fit, technology, resources, budget, and vendors before you launch.",
    tags: [...BASE_TAGS, "checklist", "e-commerce", "market expansion", "compliance"],
    collection: GLWEB_EBRO_COLLECTION,
    sourceFile: "GLWeb_Cross-Border-Market-Expansion-Readiness_Checklist 1.pdf",
    content: {
      eyebrow: "Checklist",
      title: "Cross-Border Market Expansion Readiness Checklist",
      summary:
        "Ensure your team is set up for successful e-commerce localization and long-term international growth. Before launching in a new region or language, assess readiness across content operations, technology systems, and customer support infrastructure.",
      sections: [
        {
          heading: "Strategy, expertise, and market fit",
          body: "Start with intent and knowledge: define the goal for the market, tailor the USP to local expectations, and confirm you have people who understand local regulations, logistics, taxes, and payment preferences.",
          bullets: [
            "Have we defined our primary goal (demand capture, awareness, loyalty)?",
            "Is our USP tailored to the cultural context of the region?",
            "Are we prepared for compliance requirements like the European Accessibility Act (EAA)?",
            "Have we mapped the full localized customer journey, discovery through post-sale?",
          ],
        },
        {
          heading: "Operational, technical, and localization readiness",
          body: "Confirm the systems and content pipeline can carry the new market without manual workarounds.",
          bullets: [
            "Are CMS, PIM, CRM, and translation systems connected?",
            "Do we have a strategy for high-priority content and campaigns?",
            "Can we scale updates using AI + human workflows?",
            "Is translation memory and terminology management centralized?",
          ],
        },
        {
          heading: "Budget, team, and partners",
          body: "Match funding and partnerships to the ambition, and define what success looks like before contracts are signed.",
          bullets: [
            "Have we aligned budgets with localization goals?",
            "Do we scale internal resources or outsource to a managed solution?",
            "Are KPIs and reporting frameworks in place to track ROI?",
            "Do vendors support real-time publishing, multilingual SEO, and our scale?",
          ],
        },
      ],
      stats: [
        { label: "Readiness dimensions", value: "7" },
        { label: "Use before", value: "Every launch" },
        { label: "Compliance flagged", value: "EAA" },
      ],
      cta: CTA,
      heroMedia: hero(heroCrossBorder.url, 38, 50),
    },
  },
  {
    slug: "multilingual-websites-executive-buy-in",
    title: "Multilingual Websites: How to Obtain Executive Buy-In",
    teaser:
      "Building the case for global growth through localization — evidence, strategies, and executive-ready proof points.",
    tags: [...BASE_TAGS, "executive", "business case", "roi", "enterprise"],
    collection: GLWEB_EBRO_COLLECTION,
    sourceFile: "Guide_Multilingual_Websites_How_to_Obtain_Executive_BuyIn 3.pdf",
    content: {
      eyebrow: "Guide",
      title: "Multilingual Websites: How to Obtain Executive Buy-In",
      summary:
        "Expanding into new markets starts with reaching customers in their language. This guide provides the practical evidence, tested strategies, and executive-ready proof points needed to advance your case and unlock new global growth with confidence.",
      sections: [
        {
          heading: "Quantify the value",
          body: "Localization drives revenue: most Fortune 500 companies investing in localization see higher revenue and profits than those that do not, and nearly two-thirds of B2B buyers would pay up to 30% more for a product localized to their language and market.",
          bullets: [
            "76% of shoppers prefer to purchase when information is in their language",
            "40% will leave websites that don't offer it",
            "75% of consumers are more likely to return to a localized brand",
          ],
        },
        {
          heading: "Speak the language of leadership",
          body: "Executive buy-in depends on ROI and risk mitigation. Top performers track conversions, measure growth, and expect localization to improve both revenue and compliance outcomes — so present clear, data-driven business metrics and address objections directly.",
          bullets: [
            "\"Managing languages is a burden\" — cloud-based tools automate updates and workflows",
            "Tie localization to broader company goals and cross-functional partners",
            "Show regulatory and accessibility risk reduction alongside revenue",
          ],
        },
        {
          heading: "Show the wins",
          body: "Enterprise results make the case concrete: one brand delivered a unified experience across 16 languages and 20 international sites, achieving a 22% increase in revenue and 400% growth in e-commerce conversions.",
          bullets: [
            "77% increase in revenue from Italian users",
            "34% increase in conversion rates for Dutch audiences",
            "103% increase in bookings from Russian customers",
          ],
        },
      ],
      stats: [
        { label: "Revenue increase, enterprise program", value: "22", unit: "%" },
        { label: "Growth in e-commerce conversions", value: "400", unit: "%" },
        { label: "Premium B2B buyers will pay", value: "30", unit: "%" },
        { label: "Languages unified", value: "16", caption: "Across 20 international sites" },
      ],
      discover: {
        body: "Inside the guide",
        bullets: [
          "Why multilingual websites matter",
          "Quantifying the value of localization",
          "Aligning with executive goals",
          "Overcoming misconceptions",
          "Implementation roadmap and enterprise wins",
        ],
      },
      cta: CTA,
      heroMedia: hero(heroBuyIn.url, 40, 45),
    },
  },
  {
    slug: "website-localization-playbook-considerations",
    title: "The Website Localization Playbook: Considerations for Localization",
    teaser:
      "What localization really is, the benefits it unlocks, and how a hybrid AI + human approach delivers them.",
    tags: [...BASE_TAGS, "playbook", "fundamentals", "ai", "hybrid"],
    collection: GLWEB_EBRO_COLLECTION,
    sourceFile: "TPLS_Considerations for Localization_5sep24.pdf",
    content: {
      eyebrow: "Playbook",
      title: "The Website Localization Playbook",
      summary:
        "Reach audiences faster with memorable multilingual experiences. Localization adapts content, design, and multimedia to be linguistically and culturally appropriate for global audiences — it goes beyond translation.",
      sections: [
        {
          heading: "What localization is",
          body: "Localization tailors visuals and layouts to the cultural norms of each market, not just the words. An image of a car on a U.S. website might need to be replaced with one showing the steering wheel on the right for regions where that is the norm.",
          bullets: [
            "Content, design, and multimedia adapted per market",
            "Cultural norms reflected in imagery and layout",
            "Beyond translation: the whole experience",
          ],
        },
        {
          heading: "The benefits",
          body: "Understanding the advantages of localization helps you connect with global audiences more meaningfully — and advances in technology have made it more feasible than ever.",
          bullets: [
            "Wider market reach across diverse regions",
            "Better user experience and easier transactions",
            "Brand loyalty and trust from culturally aware experiences",
            "Competitive advantage over less-localized rivals",
          ],
        },
        {
          heading: "AI + humans: a hybrid approach",
          body: "Leading organizations blend AI and human expertise to scale efficiently. AI streamlines much of the process while human review ensures every detail — discoverability included — holds up in market.",
          bullets: [
            "Your site should be as discoverable in other languages as at home",
            "Speaking local languages fosters trust and repeat business",
            "A translation management system keeps it sustainable",
          ],
        },
      ],
      stats: [
        { label: "Approach", value: "AI + human" },
        { label: "Scope", value: "Content, design, media" },
        { label: "Outcome", value: "Trust & reach" },
      ],
      cta: CTA,
      heroMedia: hero(heroConsiderations.url, 40, 45),
    },
  },
  {
    slug: "leading-retailers-global-ecommerce",
    title: "How Leading Retailers Power Global E-Commerce Experiences",
    teaser:
      "A report on challenges and opportunities for launching multilingual retail websites and omnichannel strategies.",
    tags: [...BASE_TAGS, "retail", "report", "e-commerce", "omnichannel"],
    collection: GLWEB_EBRO_COLLECTION,
    sourceFile: "TPLS_Retail Asset_10sep24 1.pdf",
    content: {
      eyebrow: "Report",
      title: "How Leading Retailers Power Global E-Commerce Experiences",
      summary:
        "A report on the challenges and opportunities for launching multilingual retail websites and omnichannel strategies, drawn from Retail Hive member research.",
      sections: [
        {
          heading: "Home markets are slowing",
          body: "With many home markets slowing, 74% of retailers in this report say growth is now expected to come from cross-border trade — a segment that continues to grow.",
          bullets: [
            "74% of retailers expect growth from cross-border trade",
            "Cross-border makes up 22% of e-commerce shipments",
            "That is more than $3.5 trillion in value",
          ],
        },
        {
          heading: "Where brands are placing bets",
          body: "Retail Hive members are shifting the mix of where revenue comes from, with a meaningful share targeting the majority of business from international markets.",
          bullets: [
            "26% of brands are actively expanding their international mix",
            "Some target over 50% of business from outside the home market",
            "Growth in mature markets sits at around 4% year over year",
          ],
        },
        {
          heading: "What it takes to execute",
          body: "Multilingual retail sites and omnichannel journeys need connected systems, scalable content operations, and a localization platform that keeps every market current without new headcount.",
          bullets: [
            "Connect CMS, PIM, and commerce to the translation layer",
            "Blend AI and human workflows by page value",
            "Keep campaigns and product data synchronized per market",
          ],
        },
      ],
      stats: [
        { label: "Retailers expecting cross-border growth", value: "74", unit: "%" },
        { label: "Share of e-commerce shipments", value: "22", unit: "%" },
        { label: "Cross-border market value", value: "$3.5T", unit: "+" },
        { label: "Mature-market growth", value: "4", unit: "%", caption: "Year over year" },
      ],
      cta: CTA,
      heroMedia: hero(heroRetailReport.url, 40, 40),
    },
  },
  {
    slug: "web-localization-playbook-travel",
    title: "The Website Localization Playbook: A Travel Brand's Guide to Global Growth",
    teaser:
      "Localize across the booking funnel, balance automation with human expertise, and scale multilingual travel content.",
    tags: [...BASE_TAGS, "travel", "playbook", "bookings", "seo"],
    collection: GLWEB_EBRO_COLLECTION,
    sourceFile: "TPLS_Web Localization Playbook Travel Brands Guide.pdf",
    content: {
      eyebrow: "Playbook",
      title: "The Website Localization Playbook: A Travel Brand's Guide to Global Growth",
      summary:
        "Website localization is a proven driver of growth in the travel industry. It improves conversions, boosts SEO visibility, and builds trust with international travelers.",
      sections: [
        {
          heading: "The multilingual traveler's journey",
          body: "Travel is global and the website should be too. Identify every touchpoint to localize across the booking funnel — inspiration, search, itinerary, checkout, confirmation, and post-trip service.",
          bullets: [
            "Localized digital experiences drive revenue and loyalty in tourism",
            "Every funnel stage is a drop-off risk in the wrong language",
            "Trust is built before the booking, not after",
          ],
        },
        {
          heading: "Hybrid localization and multilingual SEO",
          body: "A smart approach combines speed, accuracy, and cultural relevance — and language-specific search is key to travel discovery and direct bookings rather than OTA dependence.",
          bullets: [
            "AI + human workflows tuned by content value",
            "Language-specific SEO for direct booking capture",
            "Real-time updates across markets during peak season",
          ],
        },
        {
          heading: "From bounce to booked",
          body: "Proven metrics show why multilingual websites convert better, and GlobalLink Web is built for travel — the scalable localization platform trusted by the world's top travel brands.",
          bullets: [
            "Scale global updates without slowing the release cycle",
            "Make every market your home market",
            "Build trust, boost bookings, and scale globally",
          ],
        },
      ],
      stats: [
        { label: "Playbook sections", value: "8" },
        { label: "Focus", value: "Direct bookings" },
        { label: "Approach", value: "AI + human" },
      ],
      discover: {
        body: "Inside the playbook",
        bullets: [
          "Travel is global — your website should be too",
          "The multilingual traveler's journey",
          "Optimizing multilingual SEO for direct bookings",
          "Scaling global updates without slowing down",
          "Why GlobalLink Web is built for travel",
        ],
      },
      cta: CTA,
      heroMedia: hero(heroTravel.url, 40, 45),
    },
  },
];
