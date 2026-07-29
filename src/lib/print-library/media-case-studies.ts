// TransPerfect Media — recreated case study library.
//
// Source: the nine legacy Media case-study PDFs. Copy was transcribed from the
// originals and re-shaped into the live `CaseStudyContent` model; hero imagery
// was extracted from each PDF and re-hosted on the CDN (the HPE hero is a
// brand-generated stand-in — the source PDF had no usable photograph).
//
// These are read-only seeds. "Create editable copy" writes one into
// `print_assets` for the signed-in user via createPrintAsset().

import type { CaseStudyContent } from "@/lib/print-assets.types";

import heroToei from "@/assets/print-heroes/media/media-cs-toei.jpg.asset.json";
import heroAccessibility from "@/assets/print-heroes/media/media-cs-accessibility.jpg.asset.json";
import heroCrunchyroll from "@/assets/print-heroes/media/media-cs-crunchyroll.jpg.asset.json";
import heroTv5 from "@/assets/print-heroes/media/media-cs-tv5monde.jpg.asset.json";
import heroHpe from "@/assets/print-heroes/media/media-cs-hpe.jpg.asset.json";
import heroMga from "@/assets/print-heroes/media/media-cs-mga.jpg.asset.json";
import heroTts from "@/assets/print-heroes/media/media-cs-tts.jpg.asset.json";
import heroViacom from "@/assets/print-heroes/media/media-cs-viacom.jpg.asset.json";
import heroWondery from "@/assets/print-heroes/media/media-cs-wondery.jpg.asset.json";

export const MEDIA_DIVISION_ID = "bm-tp-media";

export type MediaCaseStudySeed = {
  slug: string;
  title: string;
  /** Short shelf blurb — not part of the printed asset. */
  teaser: string;
  tags: string[];
  sourceFile: string;
  content: CaseStudyContent;
};

const FOOTER = { links: ["media@transperfect.com", "media.transperfect.com"] };
const CTA = {
  label: "Talk to TransPerfect Media",
  subhead: "Localization, dubbing, subtitling, and access services for global content.",
  buttonLabel: "Start a conversation",
  url: "https://media.transperfect.com",
};

export const MEDIA_CASE_STUDIES: MediaCaseStudySeed[] = [
  {
    slug: "toei-ten-year-localization",
    title: "Turning Caution into Confidence",
    teaser: "A ten-year localization strategy with a global content studio, built one language at a time.",
    tags: ["anime", "theatrical", "long-term partnership", "IP security"],
    sourceFile: "GLMedia_TOEI_CaseStudy_2.pdf",
    content: {
      eyebrow: "Case study",
      client: "Global content studio",
      industry: "Film & television",
      audience: "International distribution and licensing leads",
      summary:
        "A ten-year localization strategy that took a highly protective studio from a single-language pilot to a multilingual, multi-region release engine.",
      challenge: {
        heading: "The challenge",
        body: "A leading global content studio, renowned for its billion-dollar entertainment franchises, wanted to expand into international markets — but had never entrusted large-scale localization to an external provider. Strict IP protection and brand consistency were paramount, any work had to satisfy passionate global fanbases, and the studio's long-term aim was to shift its revenue balance from domestic to international.",
      },
      solution: {
        heading: "Our strategy",
        body: "Start small, deliver big. We began with a single language, focused relentlessly on quality, and earned credibility release by release. We adapted through production shifts without compromising creative integrity, balanced cost-efficiency against fan approval, and delivered secure, on-time releases every time.",
      },
      result: {
        heading: "Scaling intelligently",
        body: "The engagement expanded from one language into a multilingual strategy spanning theatrical releases and episodic content across multiple regions. Integrated technology and workflows kept data secure while project scale grew consistently year over year — making TransPerfect the studio's trusted partner for global expansion.",
      },
      stats: [
        { label: "Episodes across languages", value: "1,000", caption: "Localized to date" },
        { label: "Global theatrical rollout", value: "Successful", caption: "Multi-region releases" },
        { label: "Growth in project scale", value: "Consistent", caption: "Year over year" },
        { label: "Partner for global expansion", value: "Trusted", caption: "10-year relationship" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Single-language pilot scaled to a multilingual program",
          "Theatrical and episodic content managed in parallel",
          "Secure workflows built around strict IP protection",
          "Fan-facing quality bar upheld across every market",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroToei.url, aspect: "fill", heightPct: 46, focalY: 45 },
    },
  },
  {
    slug: "accessibility-at-work",
    title: "Accessibility at Work",
    teaser: "Three real-world examples of meeting compliance standards while widening audience reach.",
    tags: ["SDH", "audio description", "compliance", "EAA"],
    sourceFile: "TPMedia_Accessibility_CaseStudy_FINAL_2.pdf",
    content: {
      eyebrow: "Case study",
      client: "Media & entertainment portfolio",
      industry: "Streaming, film & television",
      audience: "Post-production and compliance leads",
      summary:
        "As accessibility regulations reshape the way media is produced, staying current on new post-production requirements is essential. Three examples of how we've helped clients meet compliance standards while expanding reach to broader, more diverse audiences.",
      challenge: {
        heading: "SDH for a global streaming service",
        body: "Partnered since 2018, delivering more than one million minutes of subtitles and SDH content. We provide multi-language SDH for many of the service's major titles, consistently meeting a 99% quality adherence standard and strict delivery timelines — plus millions of minutes of localization and accessibility assets for the service's content partners.",
      },
      solution: {
        heading: "SDH and glossary development for a Japanese media group",
        body: "Our team supports more than 80% of the French, Italian, German, Spanish, Arabic, Hebrew, and English localization and SDH needs for a leading Japanese film, television, and video game company. The work spans some of the company's highest-profile titles and involves meticulous glossary development with strict adherence to approved terminology and style, with dedicated local teams assembled per language pair.",
      },
      result: {
        heading: "Award-winning audio description for a major motion picture",
        body: "In 2024, our team provided accessibility and post-production services for a major motion picture, integrating audio description into the post-production workflow to meet new European accessibility requirements. The film went on to win multiple industry awards, including recognition for outstanding audio description.",
      },
      stats: [
        { label: "Minutes of subtitles & SDH", value: "1M+", caption: "Global streaming service" },
        { label: "Quality adherence", value: "99", unit: "%", caption: "Sustained standard" },
        { label: "Of a media group's EU language needs", value: "80", unit: "%", caption: "FR, IT, DE, ES, AR, HE, EN" },
        { label: "Source episodes supported", value: "300+", caption: "More in progress" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Multi-language SDH across major streaming titles",
          "Glossary development with approved terminology control",
          "Dedicated in-market teams per language pair",
          "Audio description integrated into post-production",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroAccessibility.url, aspect: "fill", heightPct: 44, focalY: 50 },
    },
  },
  {
    slug: "crunchyroll-anime-localization",
    title: "Bringing Anime to Global Fans",
    teaser: "Localizing 23 titles into five languages for over 10 million Crunchyroll viewers.",
    tags: ["anime", "subtitling", "GFX", "streaming"],
    sourceFile: "TPMedia_CrunchyRoll_CaseStudy.pdf",
    content: {
      eyebrow: "Case study",
      client: "Crunchyroll",
      industry: "Anime streaming",
      audience: "Content and localization operations",
      summary:
        "Crunchyroll distributes films and television series throughout Eastern Asia, with a library of over 1,000 anime shows and 80 manga titles. Meeting global demand meant finding a partner who could carry cultural references, jokes, and puns intact.",
      challenge: {
        heading: "The challenge",
        body: "With a large and highly engaged anime fanbase, Crunchyroll needed accurate foreign-language versions that preserved the original content's essence. That required a reliable localization vendor able to capture the cultural references, jokes, and puns embedded in the source — not just translate dialogue.",
      },
      solution: {
        heading: "Our strategy",
        body: "Our team captured the nuances of each character across the show universe and successfully localized all onscreen graphics in both 2D and 3D using our top-quality GFX teams. Innovative localization technology carried the content into German, French, Italian, Spanish, and Arabic while meeting every one of Crunchyroll's quality requirements.",
      },
      result: {
        heading: "The result",
        body: "With over 10 million subscribers, Crunchyroll's fans can now enjoy their favorite anime in their chosen language without losing the storytelling essence of the original — across 23 titles and five languages.",
      },
      stats: [
        { label: "Languages", value: "5", caption: "DE, FR, IT, ES, AR" },
        { label: "Audience viewers reached", value: "10M+", caption: "Global subscribers" },
        { label: "Titles localized", value: "23", caption: "Series and films" },
        { label: "Onscreen graphics", value: "2D + 3D", caption: "Full GFX localization" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Character-level nuance preserved across the show universe",
          "All onscreen graphics localized in 2D and 3D",
          "Five-language rollout on a single workflow",
          "Cultural references, jokes, and puns carried intact",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroCrunchyroll.url, aspect: "fill", heightPct: 46, focalX: 40 },
    },
  },
  {
    slug: "tv5monde-genai-subtitling",
    title: "Cutting Subtitling Costs with Generative AI",
    teaser: "A French public broadcaster reduced subtitling cost 30% across 9,800+ hours — quality intact.",
    tags: ["GenAI", "subtitling", "broadcast", "cost reduction"],
    sourceFile: "TPMedia_TV5Monde_CaseStudy_1.pdf",
    content: {
      eyebrow: "Case study",
      client: "French public broadcaster",
      industry: "Public television",
      audience: "Localization and finance leadership",
      summary:
        "A hybrid AI-human subtitling workflow that cut costs 30% on nearly 16,000 hours of annual localized content — without sacrificing the quality audiences expect.",
      challenge: {
        heading: "The challenge",
        body: "In 2023, a longtime client — a prominent French public television network — presented us with a significant challenge: reduce subtitling costs without compromising on quality. With nearly 16,000 hours of localized content per year, they needed a sustainable solution that balanced efficiency and excellence.",
      },
      solution: {
        heading: "Our strategy",
        body: "TransPerfect Media responded with a tailored, future-forward approach: integrating generative AI into our subtitling workflows. Working closely with the client, we identified the content types and language pairs best suited for AI support, rigorously tested multiple AI engines, and developed a hybrid AI-human workflow that preserved linguistic quality while reducing manual labor.",
      },
      result: {
        heading: "The result",
        body: "More than 9,800 hours of AI-assisted content delivered at a 30% cost reduction, with increased savings projected for 2025. Quality was maintained through expert human review at every step, and the savings were reinvested into the broadcaster's business priorities.",
      },
      stats: [
        { label: "Hours of AI-assisted content", value: "9,800+", caption: "Delivered to date" },
        { label: "Cost reduction", value: "30", unit: "%", caption: "Versus prior workflow" },
        { label: "Savings", value: "Increased", caption: "Projected for 2025" },
        { label: "Quality", value: "Maintained", caption: "Through expert review" },
      ],
      quote: {
        text: "TransPerfect Media has been a reliable partner of ours for years, but their innovative use of generative AI has taken our collaboration to a new level. They've helped us be more efficient and achieve substantial cost savings without sacrificing the quality our audiences expect. The hybrid AI-human workflow they implemented has been a game-changer for us.",
        author: "Legal Director, Secretary General",
        company: "French public broadcaster",
      },
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Content types and language pairs scored for AI suitability",
          "Multiple AI engines benchmarked before rollout",
          "Human editors retained for quality assurance",
          "Savings reinvested into business priorities",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroTv5.url, aspect: "fill", heightPct: 46, focalY: 45 },
    },
  },
  {
    slug: "hpe-virtual-conference",
    title: "A 50,000-Attendee Virtual Conference in Nine Languages",
    teaser: "Cloud recording replaced manual file transfer for Hewlett Packard Enterprise's global event.",
    tags: ["events", "interpretation", "cloud recording", "enterprise"],
    sourceFile: "TransPerfect_Media_HPE_Case_Study.pdf",
    content: {
      eyebrow: "Case study",
      client: "Hewlett Packard Enterprise",
      industry: "Enterprise technology",
      audience: "Global events and localization teams",
      summary:
        "In 2020, HPE hosted 50,000 people from all over the world in a live, virtual conference — with content in nine different languages.",
      challenge: {
        heading: "The challenge",
        body: "Moving a global flagship conference from in-person to virtual meant delivering live, multilingual content to 50,000 attendees across nine languages — on tight turnaround, with interpreters distributed worldwide and bulky media files to move securely between them.",
      },
      solution: {
        heading: "Our strategy",
        body: "Using TransPerfect Media's cloud-based media localization platform, interpreters no longer needed to manually transfer bulky files. Content stayed secure and the recording and delivery process became far more efficient, allowing HPE to offer every attendee high-quality content in the language of their choice.",
      },
      result: {
        heading: "The result",
        body: "More than 1,000 audio files delivered and 129 videos localized across nine languages, with time savings of 30–40% per project. With the TransPerfect Media Suite, the transition from in-person to virtual has never been easier.",
      },
      stats: [
        { label: "Audio files delivered", value: "1,000+", caption: "Across the event" },
        { label: "Videos localized", value: "129", caption: "Session and keynote content" },
        { label: "Languages", value: "9", caption: "Live conference delivery" },
        { label: "Time savings per project", value: "30–40", unit: "%", caption: "Versus manual workflow" },
      ],
      quote: {
        text: "We would have never been able to achieve our required turnaround times without the interpreters recording in TransPerfect's cloud recording platform. Utilizing state-of-the-art technology for this global event provided our clients an extensive and exceptional experience that we were looking for.",
        author: "Sr. Manager, Translation & Localization",
        company: "Hewlett Packard Enterprise",
      },
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "50,000 attendees served in a single live event",
          "Cloud recording removed manual file transfer",
          "Content secured end to end",
          "Nine simultaneous language tracks",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroHpe.url, aspect: "fill", heightPct: 46, focalY: 45 },
    },
  },
  {
    slug: "mga-rainbow-high",
    title: "Rainbow High, Launched in Eight Markets",
    teaser: "18 episodes, 12-day batch turnarounds, and studio-quality remote recording through a pandemic.",
    tags: ["dubbing", "remote recording", "kids & family", "fast turnaround"],
    sourceFile: "TransPerfect_Media_MGA_Case_Study.pdf",
    content: {
      eyebrow: "Case study",
      client: "MGA Entertainment",
      industry: "Toys & children's entertainment",
      audience: "Content production and international distribution",
      summary:
        "MGA Entertainment wanted to launch Rainbow High with all 18 episodes in eight international markets — on a 12-day turnaround per batch of episodes.",
      challenge: {
        heading: "The challenge",
        body: "MGAE required a tight turnaround of 12 days per batch of episodes to hit an eight-market simultaneous launch. Production kicked off in December 2020 — and then the COVID-19 pandemic caused long-term studio closures across the talent network.",
      },
      solution: {
        heading: "Our strategy",
        body: "TransPerfect Media leveraged a global talent network, proprietary cloud-based technology, and streamlined workflows to hit the expedited schedule. For five of MGAE's target languages the team used TransPerfect Media Director, our proprietary remote recording tool, to produce studio-quality audio — in some cases recording up to 25 voice talents per language. The cloud workflow allowed live interaction with key stakeholders and secure delivery throughout.",
      },
      result: {
        heading: "The result",
        body: "The first season of Rainbow High launched according to plan and was well-received internationally. MGAE is now in production on their third season and continues to work with TransPerfect Media.",
      },
      stats: [
        { label: "Episodes", value: "18", caption: "Full first season" },
        { label: "International markets", value: "8", caption: "Simultaneous launch" },
        { label: "Turnaround per batch", value: "12", unit: "days", caption: "Sustained schedule" },
        { label: "Voice talents per language", value: "25", caption: "Recorded remotely" },
      ],
      quote: {
        text: "Working with TransPerfect's team is a pleasure. They are attentive to our needs and were able to design workflows to match our timelines, bringing our beloved Rainbow High characters to life internationally.",
        author: "Anne Parduci",
        company: "MGA Entertainment",
      },
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Remote recording via TransPerfect Media Director",
          "Live stakeholder interaction during sessions",
          "Business continuity maintained through studio closures",
          "Relationship now in its third season",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroMga.url, aspect: "fill", heightPct: 46, focalY: 40 },
    },
  },
  {
    slug: "text-to-speech-dubbing",
    title: "Text-to-Speech Dubbing in Action",
    teaser: "Two hybrid AI-human dubbing programs: 50%+ and 40% cost reductions, zero platform rejections.",
    tags: ["TTS", "AI dubbing", "voice cloning", "cost reduction"],
    sourceFile: "TransPerfect_Media_Text-to-Speech_Dual_Case_Study.pdf",
    content: {
      eyebrow: "Case study",
      client: "Film distributor & TV broadcaster",
      industry: "Film distribution and broadcast",
      audience: "Dubbing and post-production leadership",
      summary:
        "Our text-to-speech tool turns written scripts into natural, lifelike dialogue. Paired with human review, it delivers high-quality localized content cost-effectively — proven here across two very different clients.",
      challenge: {
        heading: "Client one — film distributor",
        body: "A European film distribution company acquiring 60+ films per year for German-speaking territories wanted to explore AI dubbing to reduce costs and optimize distribution in a rapidly changing market. We partnered on a pilot sci-fi title, designing a workflow that combined voice cloning, text-to-speech, and human post-editing, with the client closely involved in quality control of voice tone and character consistency.",
      },
      solution: {
        heading: "Client two — TV broadcaster",
        body: "A broadcast TV company facing shrinking margins needed to cut LATAM dubbing costs by 30% while meeting broadcast quality and timeline demands. We proposed a hybrid workflow combining text-to-speech with human post-editing, keeping human oversight at translation review, audio QC, and the creative mix — proving automation could cut costs without compromising broadcast standards.",
      },
      result: {
        heading: "Key takeaways",
        body: "Hybrid AI + human workflows deliver significant savings while maintaining broadcast-ready quality. Close client collaboration streamlines the process and builds confidence in new technology. And final products met the rigorous standards of major broadcasters and global streaming services — with zero rejections from platform partners on either engagement.",
      },
      stats: [
        { label: "Pilot turnaround", value: "6", unit: "weeks", caption: "Film distributor" },
        { label: "Dubbing cost reduction", value: "50", unit: "%+", caption: "Film distributor" },
        { label: "Dubbing cost reduction", value: "40", unit: "%", caption: "Broadcaster — goal was 30%" },
        { label: "Rejections from partners", value: "0", caption: "Both engagements" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Voice cloning + TTS + human post-editing pipeline",
          "Human oversight at translation review, QC, and mix",
          "Client-led quality control on tone and character",
          "Timelines held on par with traditional dubbing",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroTts.url, aspect: "fill", heightPct: 46, focalY: 50 },
    },
  },
  {
    slug: "viacom-single-vendor",
    title: "One Vendor, One Million Minutes",
    teaser: "Consolidating French localization for MTV, Nickelodeon, BET, Paramount, and Smithsonian.",
    tags: ["subtitling", "dubbing", "vendor consolidation", "broadcast"],
    sourceFile: "TransPerfect_Media_Viacom_Case_Study.pdf",
    content: {
      eyebrow: "Case study",
      client: "Viacom",
      industry: "Broadcast & cable networks",
      audience: "Procurement and localization leadership",
      summary:
        "In 2015, Viacom launched an RFP for French localization, intending to reduce its vendor count and establish a long-term relationship with one preferred partner across all its brands.",
      challenge: {
        heading: "The challenge",
        body: "Viacom needed a single vendor capable of handling the full localization needs of every brand in the portfolio — MTV, Nickelodeon, BET, Paramount, and Smithsonian — without any drop in quality or throughput during the consolidation.",
      },
      solution: {
        heading: "Our strategy",
        body: "TransPerfect Media leveraged its proprietary, cloud-based TransPerfect Media Suite to provide subtitling, captioning, voiceover, dubbing, and post-production services, meeting Viacom's full range of requirements and supporting its transition to a single-vendor model.",
      },
      result: {
        heading: "The result",
        body: "Our team streamlined more than one million minutes of content spanning over seven years of programming, enabling Viacom to accelerate production, reduce costs, and efficiently release content to its global French-speaking audience.",
      },
      stats: [
        { label: "Minutes of content streamlined", value: "1M+", caption: "Across the portfolio" },
        { label: "Years of programming", value: "7+", caption: "Continuous partnership" },
        { label: "Overall savings", value: "30", unit: "%", caption: "Versus multi-vendor model" },
        { label: "Top brands localized", value: "5", caption: "MTV, Nickelodeon, BET, Paramount, Smithsonian" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Subtitling, captioning, voiceover, dubbing, post-production",
          "Single-vendor transition across five brands",
          "Cloud-based TransPerfect Media Suite workflow",
          "French-speaking audiences served globally",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroViacom.url, aspect: "fill", heightPct: 46, focalY: 50 },
    },
  },
  {
    slug: "wondery-podcast-localization",
    title: "Immersive Podcasts, Eight Languages",
    teaser: "Remote recording and in-context review kept Wondery's audio experience intact worldwide.",
    tags: ["podcast", "audio", "remote recording", "transcreation"],
    sourceFile: "TransPerfect_Media_Wondery_Case_Study.pdf",
    content: {
      eyebrow: "Case study",
      client: "Wondery",
      industry: "Podcasting & audio",
      audience: "International content and production teams",
      summary:
        "Wondery, a premium podcast studio, needed a global partner able to translate content into eight languages while preserving the high-quality audio experience behind their immersive storytelling.",
      challenge: {
        heading: "The challenge",
        body: "Immersive audio storytelling leaves nowhere to hide: any drop in recording quality, pacing, or performance is immediately audible. Wondery needed eight-language coverage with studio-grade output — and the flexibility to keep producing while studios were closed during the COVID pandemic.",
      },
      solution: {
        heading: "Our strategy",
        body: "The TransPerfect Media Suite provided the transcription, translation, virtual recording, and in-context review capabilities Wondery needed, with the agility to work entirely outside studios. Working in our remote recording platform with in-country talent, the teams produced a range of premium-quality localized podcasts.",
      },
      result: {
        heading: "The result",
        body: "More than 150 recorded hours delivered to over a million listeners, at an average time saving of 50% per hour of finished audio — with the immersive character of the original storytelling intact in every language.",
      },
      stats: [
        { label: "Average time savings per hour", value: "50", unit: "%", caption: "Versus prior workflow" },
        { label: "Recorded hours", value: "150+", caption: "Premium localized audio" },
        { label: "Happy listeners", value: "1MM+", caption: "Across markets" },
        { label: "Languages", value: "8", caption: "In-country talent" },
      ],
      quote: {
        text: "TransPerfect's cloud-based recording technology is instrumental in transcreating our immersive storytelling for listeners in their native language, all around the globe.",
        author: "Head of International Content",
        company: "Wondery",
      },
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Transcription, translation, recording, and in-context review",
          "In-country talent recorded remotely",
          "Production continuity through studio closures",
          "Immersive audio character preserved per language",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroWondery.url, aspect: "fill", heightPct: 46, focalY: 45 },
    },
  },
];

export function findMediaCaseStudy(slug: string): MediaCaseStudySeed | undefined {
  return MEDIA_CASE_STUDIES.find((c) => c.slug === slug);
}
