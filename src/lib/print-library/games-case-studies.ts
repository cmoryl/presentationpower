// TransPerfect Games — recreated case study library.
//
// Source: the TransPerfect Games case-study PDFs supplied by the division.
// Copy was transcribed from the originals and re-shaped into the live
// `CaseStudyContent` model; hero imagery was extracted from each PDF / asset
// folder and re-hosted on the CDN.
//
// These are read-only seeds. "Create editable copy" writes one into
// `print_assets` for the signed-in user via createPrintAsset().

import type { CaseStudyContent } from "@/lib/print-assets.types";

import heroCandivore from "@/assets/print-heroes/games/games-cs-candivore.jpg.asset.json";
import heroCoolGames from "@/assets/print-heroes/games/games-cs-coolgames.jpg.asset.json";
import heroFacebook from "@/assets/print-heroes/games/games-cs-facebook.jpg.asset.json";
import heroInXile from "@/assets/print-heroes/games/games-cs-inxile.jpg.asset.json";
import heroLocalRpg from "@/assets/print-heroes/games/games-cs-local-rpg.jpg.asset.json";
import heroNanobit from "@/assets/print-heroes/games/games-cs-nanobit.jpg.asset.json";
import heroNetmarble from "@/assets/print-heroes/games/games-cs-netmarble.jpg.asset.json";
import heroNimbleGiant from "@/assets/print-heroes/games/games-cs-nimble-giant.jpg.asset.json";
import heroOliveX from "@/assets/print-heroes/games/games-cs-olivex.jpg.asset.json";
import heroOutright from "@/assets/print-heroes/games/games-cs-outright.jpg.asset.json";
import heroPaidSocial from "@/assets/print-heroes/games/games-cs-paid-social.jpg.asset.json";
import heroPlayerInsights from "@/assets/print-heroes/games/games-cs-player-insights.jpg.asset.json";
import heroPlaywith from "@/assets/print-heroes/games/games-cs-playwith.jpg.asset.json";
import heroPrisms from "@/assets/print-heroes/games/games-cs-prisms.jpg.asset.json";
import heroSocialListening from "@/assets/print-heroes/games/games-cs-social-listening.jpg.asset.json";
import heroStardock from "@/assets/print-heroes/games/games-cs-stardock.jpg.asset.json";
import heroTeam17 from "@/assets/print-heroes/games/games-cs-team17.jpg.asset.json";
import heroTiltingPoint from "@/assets/print-heroes/games/games-cs-tilting-point.jpg.asset.json";
import heroTripwire from "@/assets/print-heroes/games/games-cs-tripwire.jpg.asset.json";
import heroXbox from "@/assets/print-heroes/games/games-cs-xbox.jpg.asset.json";

export const GAMES_DIVISION_ID = "bm-tp-games";

export type GamesCaseStudySeed = {
  slug: string;
  title: string;
  /** Short shelf blurb — not part of the printed asset. */
  teaser: string;
  /** Sub-folder inside the division × type folder. */
  collection: string;
  tags: string[];
  sourceFile: string;
  content: CaseStudyContent;
};

const FOOTER = { links: ["games@transperfect.com", "www.transperfectgames.com"] };
const CTA = {
  label: "Talk to TransPerfect Games",
  subhead:
    "Localization, LQA, player support, art production, porting, and player research for global games.",
  buttonLabel: "Start a conversation",
  url: "https://www.transperfectgames.com",
};

const C_LOC = "Localization & LQA";
const C_SUPPORT = "Player support & community";
const C_ART = "Art & production";
const C_RESEARCH = "Player research & insights";
const C_MARKETING = "Marketing & social";
const C_PORTING = "Porting, audio & QA";

export const GAMES_CASE_STUDIES: GamesCaseStudySeed[] = [
  {
    slug: "candivore-match-masters-player-support",
    title: "Scaling Player Support for Match Masters",
    teaser: "Multilingual support in 10+ languages, millions of tickets, and a 90%+ quality threshold.",
    collection: C_SUPPORT,
    tags: ["player support", "multilingual", "QA", "mobile"],
    sourceFile: "TPGames_CaseStudy_MatchMasters.pdf",
    content: {
      eyebrow: "Case study",
      client: "Candivore",
      industry: "Mobile gaming",
      audience: "Player support and operations leads",
      summary:
        "Candivore needed multilingual player support at scale for Match Masters — with the flexibility to grow, and a quality bar high-value players would notice.",
      challenge: {
        heading: "The challenge",
        body: "Candivore, a Tel Aviv-based gaming company known for Match Masters, needed customer support for a diverse player base. They required multilingual assistance in over 10 languages and had to handle a substantial volume of player tickets, particularly from high-value players. That led them to seek a solution that addressed immediate needs while offering long-term scalability and flexibility.",
      },
      solution: {
        heading: "Our solution",
        body: "TransPerfect Games brought customer support expertise and multilingual capability, implementing a flexible staffing model for rapid scaling and cost-effective resource allocation. Our global talent network removed the language barrier and added diverse cultural perspectives. We took control of the entire support lifecycle — recruitment, training, management, and attractive agent career paths — and integrated QA responsibilities directly into the support process, with the existing QA department guiding training, support talent, and translation.",
      },
      result: {
        heading: "The result",
        body: "Rapid scalability optimized operational costs. Multilingual support and meticulous handling of millions of player tickets increased player satisfaction, especially among high-value players. Clear career pathways improved agent retention and reduced recruitment and training costs, while integrated QA sustained a 90%+ quality control threshold in line with industry standards.",
      },
      stats: [
        { label: "Support languages", value: "10+", caption: "Delivered by native speakers" },
        { label: "Quality control threshold", value: "90", unit: "%+", caption: "Sustained across tickets" },
        { label: "Player tickets handled", value: "Millions", caption: "Across the player base" },
        { label: "Staffing model", value: "Flexible", caption: "Rapid scale up and down" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "End-to-end support lifecycle ownership",
          "Flexible staffing for rapid scale",
          "QA embedded in the support workflow",
          "Career pathways that lifted agent retention",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroCandivore.url, aspect: "fill", heightPct: 44, focalY: 45 },
    },
  },
  {
    slug: "coolgames-in-game-asset-creation",
    title: "In-Game Asset Creation for CoolGames",
    teaser: "20 custom 2D assets for Merge Academy, delivered in a 20-day production cycle.",
    collection: C_ART,
    tags: ["2D art", "asset creation", "art direction", "mobile"],
    sourceFile: "TPGames_CaseStudy_CoolGames.pdf",
    content: {
      eyebrow: "Case study",
      client: "CoolGames",
      industry: "Mobile gaming",
      audience: "Art and production leads",
      summary:
        "A tight deadline, limited internal capacity, and strict technical standards — met with an embedded 2D artist and art director.",
      challenge: {
        heading: "The challenge",
        body: "CoolGames needed support creating multiple in-game assets for their title Merge Academy. Facing a tight deadline and limited internal capacity, the client also required that all assets comply with specific technical standards to ensure long-term reusability for future updates.",
      },
      solution: {
        heading: "Our solution",
        body: "TransPerfect Games provided an experienced 2D artist for a 20-day production cycle, overseen by an art director. Working inside the client's preferred software, our team created 20 custom-designed assets across two key in-game scenes — tables, chairs, couches, and more — incorporating client feedback throughout and integrating with CoolGames' existing workflows for seamless collaboration.",
      },
      result: {
        heading: "The result",
        body: "Twenty high-quality 2D assets were delivered on time and within budget. All assets met the client's quality benchmarks despite the tight timeline, aligned with the game's established visual style, and were built for future reusability — letting CoolGames hit their deadline without compromising quality.",
      },
      stats: [
        { label: "Custom 2D assets", value: "20", caption: "Across two in-game scenes" },
        { label: "Production cycle", value: "20", unit: " days", caption: "Artist plus art director" },
        { label: "Delivered on budget", value: "100", unit: "%", caption: "Within client budget" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Embedded 2D artist with art-director oversight",
          "Work delivered in the client's preferred software",
          "Assets built to technical standards for reuse",
          "Iterative feedback loops throughout production",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroCoolGames.url, aspect: "fill", heightPct: 42, focalY: 50 },
    },
  },
  {
    slug: "facebook-community-growth-traditional-chinese",
    title: "Promoting a New Game on Facebook",
    teaser: "450% monthly follower growth across Taiwan, Malaysia, Hong Kong, and Macau.",
    collection: C_MARKETING,
    tags: ["community management", "social", "Traditional Chinese", "APAC"],
    sourceFile: "TPGames_CaseStudy_FacebookMarketing.pdf",
    content: {
      eyebrow: "Case study",
      client: "Leading Chinese video platform & games company",
      industry: "Mobile & simulation gaming",
      audience: "Marketing and community leads",
      summary:
        "Building product awareness and player numbers for a new simulation game across Traditional Chinese-speaking markets.",
      challenge: {
        heading: "The challenge",
        body: "One of the top three Chinese video platforms and a major gaming company in China wanted to promote its new simulation game in the Traditional Chinese-speaking markets of Taiwan, Malaysia, Hong Kong, and Macau. The goal was to build product awareness and increase the number of people playing the new game in those markets.",
      },
      solution: {
        heading: "Our solution",
        body: "TransPerfect Games provided community management services with native Traditional Chinese-speaking marketing specialists. We began with market research to identify the most appropriate platforms to reach the target audience, then developed a content strategy and created localized content to attract new followers on Facebook. We generated discussion topics, launched engagement activities, and collected user feedback to feed product development.",
      },
      result: {
        heading: "The result",
        body: "Ongoing data reviews and analysis continually improved the client's social strategy, expanding content formats and diversifying community activities. Followers, impressions, and sign-ups all climbed sharply month over month.",
      },
      stats: [
        { label: "Increase in Facebook followers", value: "450", unit: "%", caption: "Every month" },
        { label: "More sign-ups for the game", value: "3x", caption: "Within two months" },
        { label: "Increase in Facebook impressions", value: "275", unit: "%", caption: "Every month" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Native Traditional Chinese marketing specialists",
          "Market research led platform selection",
          "Localized content and engagement programming",
          "Continuous data review and strategy tuning",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroFacebook.url, aspect: "fill", heightPct: 42, focalY: 45 },
    },
  },
  {
    slug: "inxile-wasteland-3-localization",
    title: "Expanding the Wasteland Universe",
    teaser: "Simultaneous multilingual worldwide release for Wasteland 3 — and Frostpoint VR three days later.",
    collection: C_LOC,
    tags: ["localization", "RPG", "LQA", "simship"],
    sourceFile: "TPGames_CaseStudy_InXileEntertainment.pdf",
    content: {
      eyebrow: "Case study",
      client: "inXile Entertainment",
      industry: "Console & PC gaming",
      audience: "Localization and production leads",
      summary:
        "Localizing a lore-heavy open-world RPG into five languages for a simultaneous worldwide release — then scaling to a second title within days.",
      challenge: {
        heading: "The challenge",
        body: "California-based developer inXile Entertainment helped shape the modern landscape for how great roleplaying games are made. To ensure its successful Wasteland franchise retained global appeal and accessibility, inXile began working with TransPerfect Games in 2020 to localize its most recent hit, Wasteland 3 — a title dense with existing lore, branching narrative, and deep roleplaying systems.",
      },
      solution: {
        heading: "Expanding the universe",
        body: "With extensive experience in open-world RPGs, our localization teams quickly familiarized themselves with the right tone and feel for Wasteland 3. Incorporating inXile's established style bibles, terminology, and previously localized content, TransPerfect Games translated the installment into French, German, Spanish, Polish, and Russian — securing a simultaneous, multilingual worldwide release for the hotly anticipated title.",
      },
      result: {
        heading: "Successful collaborations",
        body: "The quality of the work became clear early, leading inXile to widen the scope to include Frostpoint VR: Proving Grounds, a team-based multiplayer shooter for Oculus Rift. Within days, TransPerfect Games upscaled its teams to run both projects simultaneously, allowing inXile to release Wasteland 3 and Frostpoint within three days of each other in August 2020.",
      },
      quote: {
        text: "Our games are full of branching narratives and deep roleplaying elements which can be challenging to localize and QA. TransPerfect Games handles these challenges with skillfulness and efficiency. They are a very versatile and experienced team; you will not find better value when it comes to timeliness, quality, and expertise.",
        author: "Ray Cobo",
        role: "Executive Producer",
        company: "inXile Entertainment",
      },
      stats: [
        { label: "Languages localized", value: "5", caption: "FR, DE, ES, PL, RU" },
        { label: "Titles running in parallel", value: "2", caption: "Wasteland 3 + Frostpoint VR" },
        { label: "Days between releases", value: "3", caption: "August 2020" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Style bibles and legacy terminology reused end to end",
          "Simultaneous multilingual worldwide release",
          "Teams upscaled within days for a second title",
          "Branching-narrative QA handled in-house",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroInXile.url, aspect: "fill", heightPct: 44, focalY: 45 },
    },
  },
  {
    slug: "local-rpg-experts-launch-decisions",
    title: "Empowering Launch Decisions with Local RPG Experts",
    teaser: "Expert-level FTUE evaluation in Korea and Japan to pick the right localized build.",
    collection: C_RESEARCH,
    tags: ["user research", "FTUE", "Korea", "Japan"],
    sourceFile: "TPGames_CaseStudy_LocalRPGExperts.pdf",
    content: {
      eyebrow: "Case study",
      client: "Global mobile game developer & publisher",
      industry: "Mobile RPG",
      audience: "User research and localization strategy leads",
      summary:
        "Choosing between two localized builds for Korea and Japan using structured, expert-level regional feedback.",
      challenge: {
        heading: "The challenge",
        body: "A global mobile game developer and publisher was preparing to launch new localized versions of their title for Korean and Japanese markets. To decide between the existing and updated builds, the client needed in-depth strategic insights from local RPG experts with a deep understanding of regional player preferences — covering gameplay mechanics and UX against top local RPGs, monetization alignment with regional expectations, and cultural and market context beyond player behavior.",
      },
      solution: {
        heading: "Our solution",
        body: "TransPerfect Games launched a specialized user research program focused entirely on expert-level feedback. For each market, three professional localization gaming experts were sourced — individuals who evaluate game quality and localization professionally and are active in their local gaming communities. Each played both versions for 30 minutes, completed a detailed questionnaire, and joined a moderated interview in their native language, delivering both real-time reactions and comparative analysis across UX, narrative clarity, monetization, and cultural alignment.",
      },
      result: {
        heading: "The result",
        body: "Our in-house user research consultant synthesized gameplay footage, expert feedback, and market comparisons into a strategic insights report that far exceeded traditional playtesting value: a clear, data-driven recommendation on the preferred localized version, comparative analysis against leading local RPGs, identification of UX friction points during onboarding, and expert suggestions to optimize monetization.",
      },
      stats: [
        { label: "Markets evaluated", value: "2", caption: "Korea and Japan" },
        { label: "Professional experts", value: "6", caption: "Three per market" },
        { label: "Gameplay per build", value: "30", unit: " min", caption: "Both localized versions" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Expert panel sourced from local gaming communities",
          "Structured questionnaire plus moderated native-language interviews",
          "Comparative benchmarking against top local RPGs",
          "Single strategic insights report with a clear recommendation",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroLocalRpg.url, aspect: "fill", heightPct: 42, focalY: 50 },
    },
  },
  {
    slug: "nanobit-player-support-social",
    title: "24/7 Player Support for Nanobit",
    teaser: "A multilingual support and social media task force stood up in weeks for Tabou Stories.",
    collection: C_SUPPORT,
    tags: ["player support", "community management", "social", "mobile"],
    sourceFile: "TPGames_CaseStudy_Nanobit.pdf",
    content: {
      eyebrow: "Case study",
      client: "Nanobit",
      industry: "Mobile gaming",
      audience: "Customer communications leads",
      summary:
        "Improving player support through readily available customer service and multilingual social media engagement.",
      challenge: {
        heading: "The challenge",
        body: "In March 2020, Nanobit — a highly rated, top-tier mobile gaming company — was looking to improve player support through readily available customer service and social media engagement. To meet their goals, Nanobit brought in experts from TransPerfect Games.",
      },
      solution: {
        heading: "Our solution",
        body: "After an initial call, our team identified Nanobit's gaps, wants, and needs. Within a few weeks, TransPerfect Games formed a task force of agents and a coordinator who ensured a smooth onboarding process, then provided 24/7 support and community management in multiple languages for Tabou Stories: Love Episodes.",
      },
      result: {
        heading: "The result",
        body: "The engagement delivered continuous, multilingual player care and social media management, with every team member bringing genuine interest to the project and completing tasks on time — a successful project from onboarding through steady-state operation.",
      },
      quote: {
        text: "It was a pleasure working with these experts — it only took a quick call for TG to understand our needs. Each member of their team brought genuine interest to the project and completed every task in a timely manner.",
        author: "Dominik Tartayo",
        role: "Customer Communications Lead",
        company: "Nanobit",
      },
      stats: [
        { label: "Support coverage", value: "24/7", caption: "Player care and community" },
        { label: "Onboarding time", value: "Weeks", caption: "Task force stood up fast" },
        { label: "Languages supported", value: "Multiple", caption: "Support and social" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Dedicated agent task force with a coordinator",
          "24/7 multilingual player support",
          "Social media and community management",
          "Rapid discovery-to-onboarding cycle",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroNanobit.url, aspect: "fill", heightPct: 40, focalY: 45 },
    },
  },
  {
    slug: "netmarble-global-localization",
    title: "Shaping Worlds Together with Netmarble",
    teaser: "Six languages, new markets across Europe, Asia, and South America — since 2015.",
    collection: C_LOC,
    tags: ["localization", "LQA", "mobile", "long-term partnership"],
    sourceFile: "TPGames_CaseStudy_Netmarble.pdf",
    content: {
      eyebrow: "Case study",
      client: "Netmarble",
      industry: "Mobile gaming",
      audience: "Localization managers and producers",
      summary:
        "Helping one of the world's top mobile publishers open new borders with culturally accurate translation and LQA.",
      challenge: {
        heading: "The challenge",
        body: "In the two decades since its founding in 2000, Korean games company Netmarble established itself among the top mobile games publishers globally — through the quality of its games and its alignment with fan-favorite IPs and franchises. To open up global borders and access new markets, Netmarble sought out TransPerfect Games for its strong reputation in localization.",
      },
      solution: {
        heading: "Our solution",
        body: "With TransPerfect Games, Netmarble reached new audiences throughout Europe, Asia, and South America with culturally accurate translations in French, German, Spanish, Italian, Russian, and Brazilian Portuguese — backed by LQA teams tuned to each title's tone and terminology.",
      },
      result: {
        heading: "Shaping worlds together",
        body: "The partnership has grown exponentially since 2015. Unwavering dedication to both linguistic and cultural quality earned the trust of Netmarble's teams and producers, leading to work on some of the publisher's most successful titles, including Lineage 2: Revolution, Marvel Future Fight, KOONGYA Draw Party, Blade & Soul Revolution, Phantomgate: The Last Valkyrie, and Iron Throne.",
      },
      quote: {
        text: "This long-term cooperation is built thanks to the TransPerfect Games team's enthusiasm for understanding the gaming industry and each of our products — not to mention all those strengths they've been offering to us in the professional performance of their work.",
        author: "Kihoon Kim",
        role: "Localization Team Manager",
        company: "Netmarble",
      },
      stats: [
        { label: "Languages delivered", value: "6", caption: "FR, DE, ES, IT, RU, PT-BR" },
        { label: "Partnership since", value: "2015", caption: "Growing year over year" },
        { label: "Flagship titles supported", value: "6+", caption: "Including Marvel Future Fight" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Translation and LQA under one program",
          "Cultural accuracy prioritized alongside linguistic quality",
          "Coverage across Europe, Asia, and South America",
          "Trusted by producers on hot-property titles",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroNetmarble.url, aspect: "fill", heightPct: 44, focalY: 40 },
    },
  },
  {
    slug: "nimble-giant-quantum-league-community",
    title: "Building a Community for Quantum League",
    teaser: "A self-sustaining Discord community built from scratch for a competitive FPS launch.",
    collection: C_SUPPORT,
    tags: ["community management", "Discord", "FPS", "launch"],
    sourceFile: "TPGames_CaseStudy_NimbleGiantEntertainment.pdf",
    content: {
      eyebrow: "Case study",
      client: "Nimble Giant Entertainment",
      industry: "PC & console gaming",
      audience: "Marketing and community leads",
      summary:
        "Reaching and expanding an online audience ahead of a competitive FPS launch — and keeping it alive long after.",
      challenge: {
        heading: "The challenge",
        body: "Argentinian developer and publisher Nimble Giant Entertainment has brought fast-paced games to players worldwide since 2011, from Quantum League and Hellbound to Master of Orion: Conquer the Stars and Champions of Regnum. In 2020, Nimble Giant reached out to TransPerfect Games to help build and maintain momentum for its then-upcoming release Quantum League — finding the right partner to spread the word to hungry gaming communities and keep the buzz going through launch and beyond.",
      },
      solution: {
        heading: "Start spreading the news",
        body: "Our expert community management teams sought out active, valuable interactions in the digital spaces where gamers gather most — participating in community forums where they existed and building entirely new platforms where they didn't. That gave players a place to share their excitement and gave the Nimble Giant team a thriving base to share news and developments with.",
      },
      result: {
        heading: "The result",
        body: "Most notably, the team built an incredibly active and self-sustaining community on Discord, where players still meet to discuss the game today and where the Nimble Giant team can engage one-on-one to discuss how to improve, build on, and carry Quantum League into the future.",
      },
      quote: {
        text: "We were happily impressed by the quick setup time — especially considering the quality the experts at TransPerfect Games provided in the community management of our Discord communities and other channels.",
        author: "Lionel Zajdweber",
        role: "Marketing Director",
        company: "Nimble Giant Entertainment",
      },
      stats: [
        { label: "Community platform built", value: "Discord", caption: "Self-sustaining to this day" },
        { label: "Setup time", value: "Rapid", caption: "Live ahead of launch" },
        { label: "Partnership start", value: "2020", caption: "Quantum League launch" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Audience mapping across existing gaming forums",
          "New owned community platforms built from zero",
          "Pre-launch, launch, and post-launch momentum",
          "Direct developer-to-player engagement channels",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroNimbleGiant.url, aspect: "fill", heightPct: 44, focalY: 45 },
    },
  },
  {
    slug: "olivex-zombies-run-localization",
    title: "Reach Your Players Globally",
    teaser: "Character localization and voice recording for Zombies, Run! in four languages.",
    collection: C_PORTING,
    tags: ["voiceover", "character localization", "audio", "mobile"],
    sourceFile: "TPGames_CaseStudy_OliveX.pdf",
    content: {
      eyebrow: "Case study",
      client: "OliveX",
      industry: "Mobile & audio gaming",
      audience: "Audio production and localization leads",
      summary:
        "Bringing a world-renowned augmented audio running game to international audiences through casting, voice recording, and UI localization.",
      challenge: {
        heading: "The challenge",
        body: "OliveX wanted to bring Zombies, Run! — a world-renowned augmented audio running game — to an international audience. To do that, OliveX needed a thoughtful character localization partner who could capture and adapt the energy and humor of the original stories through casting, voice recording, and app UI string localization into Spanish, Korean, French, and Japanese.",
      },
      solution: {
        heading: "Our solution",
        body: "The first season included 23 missions involving zombie chases and has attracted more than 10 million players. OliveX chose TransPerfect for its technology and service versatility and its ability to record each language using cloud-based management more quickly. This hybrid approach made it possible to record with preferred talent both inside and outside the studio, while a cloud-based translation management system localized both mobile and web app UI.",
      },
      result: {
        heading: "The result",
        body: "Season one shipped complete in four languages with 37 characters and 580 minutes of audio recorded per language — and TransPerfect and OliveX look forward to localizing future seasons.",
      },
      stats: [
        { label: "Languages", value: "4", caption: "ES, KO, FR, JA" },
        { label: "Characters cast", value: "37", caption: "Across season one" },
        { label: "Minutes of audio recorded", value: "580", caption: "Per language" },
        { label: "Players attracted", value: "10M+", caption: "Season one" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Casting and direction for 37 characters",
          "Hybrid in-studio and remote cloud recording",
          "Mobile and web app UI string localization",
          "Cloud-based translation management",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroOliveX.url, aspect: "fill", heightPct: 44, focalY: 45 },
    },
  },
  {
    slug: "outright-games-discord-community",
    title: "A Secure Community Hub for Outright Games",
    teaser: "A custom Discord platform for 28 studio games across 25 countries — 150% follower growth.",
    collection: C_SUPPORT,
    tags: ["community management", "Discord", "family games", "ambassadors"],
    sourceFile: "TPGames_CaseStudy_OutrightGames.pdf",
    content: {
      eyebrow: "Case study",
      client: "Outright Games",
      industry: "Family & licensed gaming",
      audience: "Community and brand leads",
      summary:
        "A secure, customized community platform that connected ambassadors, internal stakeholders, and players around 28 titles.",
      challenge: {
        heading: "The challenge",
        body: "Outright Games, a global leader in video game publishing known for titles such as Jumanji, Ice Age: Scrat's Nutty Adventure, and Paw Patrol: On A Roll, was looking to partner with a professional gaming service provider who could support their community management initiatives by creating and maintaining a Discord server — giving Outright better engagement with their game ambassadors and internal stakeholders.",
      },
      solution: {
        heading: "Our solution",
        body: "TransPerfect Games offered an optimized, integrated solution through Discord to keep ambassadors better informed about the games they loved and to develop a feedback loop to improve the games. We created a secure server for Outright Games and developed channels for all 28 studio games across the 25 countries where they offered their titles.",
      },
      result: {
        heading: "The result",
        body: "After launching the customized and secure community platform, Outright Games saw results almost immediately: their channels grew followers by 150%, exceeding original expectations. Outright Games and TransPerfect Games continue to work on current and future projects around building a positive, engaging community management hub.",
      },
      stats: [
        { label: "Studio games covered", value: "28", caption: "Dedicated channels each" },
        { label: "Countries", value: "25", caption: "Global coverage" },
        { label: "Follower growth", value: "150", unit: "%", caption: "Exceeded expectations" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Secure, permissioned server architecture",
          "Per-title channels for 28 studio games",
          "Ambassador and stakeholder programming",
          "Structured player feedback loop",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroOutright.url, aspect: "fill", heightPct: 44, focalY: 45 },
    },
  },
  {
    slug: "paid-social-two-game-launch",
    title: "Using Paid Social to Promote Two New Games",
    teaser: "Localized paid campaigns across seven key markets on Facebook, Instagram, and Twitter.",
    collection: C_MARKETING,
    tags: ["paid social", "campaign management", "creative", "multi-market"],
    sourceFile: "TPGames_CaseStudy_PaidSocial.pdf",
    content: {
      eyebrow: "Case study",
      client: "Switzerland-based gaming company",
      industry: "Gaming",
      audience: "Performance marketing leads",
      summary:
        "Native-language ad copy, social creative, and managed campaigns to launch two new games in seven markets.",
      challenge: {
        heading: "The challenge",
        body: "A Switzerland-based gaming company wanted to give users the opportunity to immerse themselves in a multi-layered world while playing its games. The client needed help promoting two newly developed titles across seven key markets: the US, the UK, Germany, France, Spain, Italy, and Brazil.",
      },
      solution: {
        heading: "Our solution",
        body: "The most effective route was paid social on Facebook, Instagram, and Twitter. Our native-speaking social specialists created ad copy in local languages carrying the information that would appeal to each target audience, alongside social assets including static banners and carousels. TransPerfect Games managed the campaigns end to end, monitoring performance and optimizing regularly.",
      },
      result: {
        heading: "The result",
        body: "Alongside paid delivery, we provided community management — responding quickly to the audience, increasing engagement, and encouraging conversation. Follower growth, sign-ups, and impressions all rose sharply.",
      },
      stats: [
        { label: "Increase in Facebook followers", value: "450", unit: "%", caption: "Every month" },
        { label: "More sign-ups for the game", value: "3x", caption: "Within two months" },
        { label: "Increase in Facebook impressions", value: "275", unit: "%", caption: "Every month" },
        { label: "Key markets", value: "7", caption: "US, UK, DE, FR, ES, IT, BR" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Native-language ad copy per market",
          "Static banner and carousel creative production",
          "Managed, continuously optimized campaigns",
          "Community management layered on paid delivery",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroPaidSocial.url, aspect: "fill", heightPct: 40, focalY: 50 },
    },
  },
  {
    slug: "player-insights-localized-research",
    title: "Driving Launch Decisions Through Localized Player Insights",
    teaser: "Twenty players across Korea and Japan, recorded gameplay, and native-language interviews.",
    collection: C_RESEARCH,
    tags: ["user research", "FTUE", "Korea", "Japan", "playtesting"],
    sourceFile: "TPGames_CaseStudy_PlayerInsights.pdf",
    content: {
      eyebrow: "Case study",
      client: "Global mobile game developer & publisher",
      industry: "Mobile RPG",
      audience: "Research and launch strategy leads",
      summary:
        "Native-language insight from real players to choose between two localized builds ahead of launch.",
      challenge: {
        heading: "The challenge",
        body: "Our client, a global mobile game developer and publisher, was preparing to launch a newly localized version of their game but needed help deciding between the existing and updated localizations for Korean and Japanese markets. Their research team aimed to evaluate the first-time user experience for RPG newcomers in both regions, seeking feedback rooted in cultural understanding — native-language insights from local users with strategic oversight from an experienced global partner.",
      },
      solution: {
        heading: "Our solution",
        body: "TransPerfect Games delivered a tailored user research program with on-the-ground teams in both Korea and Japan. Leveraging our extensive database of verified players, we filtered candidates to match the client's target audience and selected ten qualified participants per country to play the game for 30 minutes with screen activity recorded, then join a moderated post-gameplay interview in their native language.",
      },
      result: {
        heading: "The result",
        body: "All gameplay recordings and interview data were collected and reviewed, and our in-house user research consultant analyzed the aggregated data to identify key patterns, emotional responses, and friction points across both markets. The final report set out which localized version players preferred and why, the gameplay elements that enhanced or detracted from the experience, and actionable recommendations for launch strategy.",
      },
      stats: [
        { label: "Participants", value: "20", caption: "Ten per market" },
        { label: "Markets", value: "2", caption: "Korea and Japan" },
        { label: "Recorded gameplay per player", value: "30", unit: " min", caption: "Screen capture" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Verified-player database screening to target audience",
          "Recorded gameplay plus moderated native-language interviews",
          "In-house consultant synthesis across both markets",
          "Launch-ready recommendations, not raw transcripts",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroPlayerInsights.url, aspect: "fill", heightPct: 42, focalY: 50 },
    },
  },
  {
    slug: "playwith-seal-wtf-xbox-port",
    title: "Porting Seal: WHAT the FUN to Xbox",
    teaser: "A four-month console port, Xbox certification, and an on-time cross-play release.",
    collection: C_PORTING,
    tags: ["porting", "Xbox certification", "cross-play", "console"],
    sourceFile: "TPGames_CaseStudy_playwith.pdf",
    content: {
      eyebrow: "Case study",
      client: "Playwith Games",
      industry: "PC & console gaming",
      audience: "Production and platform leads",
      summary:
        "A first console launch for a KOSDAQ-listed Korean publisher — port, submission, certification, and post-launch handover.",
      challenge: {
        heading: "The challenge",
        body: "Playwith Games, founded in 1998 in South Korea, is a KOSDAQ-listed global developer and publisher known for R.O.H.A.N. and Seal Online. They needed a partner familiar with porting games to Xbox platforms and expert in the XR, submission, and Microsoft release process — to port and launch Seal: WHAT the FUN, an omniverse multiplayer party royale game with a Very Positive Steam rating, to Xbox One, Xbox Series X/S, and Microsoft PC while allowing cross-platform play with the Steam version.",
      },
      solution: {
        heading: "Our solution",
        body: "TransPerfect Gaming provided a porting solution optimizing the Steam build for Microsoft platforms. The port took approximately four months and was executed systematically against the initial milestone plan, with regular meetings, daily Slack communication, and weekly status reports. As this was Playwith's first console launch, we communicated with Microsoft directly on all submission and launch questions, researched and executed the technical parts of submission and marketplace setup, and supported the Xbox releases and post-launch maintenance.",
      },
      result: {
        heading: "The result",
        body: "TransPerfect engaged within one week of a signed agreement and — through regular communication, milestone checkpoints, and owning the submission process end to end — got the game ported to and tested on all target platforms, through Xbox certification, and set up for an on-time release. Post-release, we created detailed documentation on the build and submission process, allowing Playwith to take over future updates on Microsoft platforms.",
      },
      stats: [
        { label: "Port duration", value: "4", unit: " months", caption: "Milestone-driven plan" },
        { label: "Engagement start", value: "1", unit: " week", caption: "After signed agreement" },
        { label: "Target platforms", value: "3", caption: "Xbox One, Series X/S, MS PC" },
        { label: "Release timing", value: "On time", caption: "Through Xbox certification" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Steam-to-Xbox port with cross-play preserved",
          "Direct Microsoft submission and marketplace setup",
          "Weekly status reporting and daily Slack cadence",
          "Handover documentation for future self-service updates",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroPlaywith.url, aspect: "fill", heightPct: 44, focalY: 45 },
    },
  },
  {
    slug: "prisms-vr-voiceover",
    title: "Rapid VR Voiceover for Prisms",
    teaser: "33 voiceover modules and 75,500+ words delivered on a six-day turnaround.",
    collection: C_PORTING,
    tags: ["voiceover", "StudioNEXT", "VR", "education"],
    sourceFile: "TPGames_CaseStudy_Prisms.pdf",
    content: {
      eyebrow: "Case study",
      client: "Prisms",
      industry: "VR & digital education",
      audience: "Content and audio production leads",
      summary:
        "Cloud-based dubbing technology turned a six-day deadline for 33 VR voiceover modules into a delivered project.",
      challenge: {
        heading: "The challenge",
        body: "Prisms, a digital education company addressing engagement and attrition in STEM math deficiencies, created VR learning software focused on spatial reasoning and core STEM skills. To achieve the goals of the project, Prisms needed 33 unique voiceover modules — containing hundreds of short audio clips — within a six-day turnaround.",
      },
      solution: {
        heading: "Our solution",
        body: "TransPerfect supplied scientifically specialized Spanish linguists and deployed StudioNEXT, our cloud-based dubbing and voiceover technology. Instead of booking a studio and talent, the technology let Prisms sit in on sessions while talent recorded from anywhere in the world — protecting quality while collapsing the timeline.",
      },
      result: {
        heading: "The result",
        body: "TransPerfect supplied over 75,500 words across both science and math modules using six voice talents, delivering all modules to the requested deadlines and allowing Prisms to release the VR modules promptly.",
      },
      stats: [
        { label: "Day turnaround", value: "6", caption: "From brief to delivery" },
        { label: "Specialized linguists", value: "6", caption: "Scientific Spanish" },
        { label: "Words of voiceover", value: "75,500+", caption: "Science and math modules" },
        { label: "Voiceover modules", value: "33", caption: "Hundreds of audio clips" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "StudioNEXT cloud recording with live client attendance",
          "Subject-matter specialized linguists",
          "Distributed talent, no studio booking bottleneck",
          "Full module set delivered inside six days",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroPrisms.url, aspect: "fill", heightPct: 42, focalY: 45 },
    },
  },
  {
    slug: "social-listening-online-reputation",
    title: "Understanding a Game's Online Reputation",
    teaser: "5,000 pieces of qualified data across English, German, and Chinese social channels.",
    collection: C_RESEARCH,
    tags: ["social listening", "reputation", "insights", "multilingual"],
    sourceFile: "TPGames_CaseStudy_SocialListening.pdf",
    content: {
      eyebrow: "Case study",
      client: "Global games publisher",
      industry: "Gaming",
      audience: "Brand, community, and product leads",
      summary:
        "Manual, multilingual social listening that turned scattered player chatter into a product and reputation roadmap.",
      challenge: {
        heading: "The challenge",
        body: "A client wanted to understand its online reputation and needed to capture data from native English, German, and Chinese speakers via social listening — across the channels where its players actually talk.",
      },
      solution: {
        heading: "Our solution",
        body: "TransPerfect Games began by identifying the most relevant product keywords, then gathered social content and categorized posts as positive, neutral, or negative. With those parameters set, the team manually analyzed thousands of posts to gather deeper insight into their nature rather than relying on sentiment automation alone.",
      },
      result: {
        heading: "The result",
        body: "The client received three social listening reports identifying over 5,000 pieces of critical differences, data insights, and key recommendations covering localization, bugs, game assets, new features, NPCs, and more. The reports surfaced more than 10 key opportunities, enabling ongoing support such as reputation management and social media strategy to improve brand perception.",
      },
      stats: [
        { label: "Pieces of qualified data collected", value: "5,000", caption: "Manually reviewed" },
        { label: "Social listening reports generated", value: "3", caption: "EN, DE, ZH" },
        { label: "Key opportunities identified", value: "10+", caption: "Product + content" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Product keyword taxonomy built first",
          "Manual sentiment categorization by native speakers",
          "Findings mapped to localization, bugs, features, and NPCs",
          "Feeds ongoing reputation and social strategy work",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroSocialListening.url, aspect: "fill", heightPct: 42, focalY: 45 },
    },
  },
  {
    slug: "stardock-sins-ii-art-production",
    title: "Scalable Art Production for Stardock",
    teaser: "14 3D spaceship models and 14 2D concepts delivered in a single month.",
    collection: C_ART,
    tags: ["3D art", "concept art", "scaling", "RTS"],
    sourceFile: "TPGames_CaseStudy_Stardock.pdf",
    content: {
      eyebrow: "Case study",
      client: "Stardock",
      industry: "PC gaming",
      audience: "Art directors and production leads",
      summary:
        "A sudden volume spike on Sins of a Solar Empire II met with rapid team scaling and an integrated concept-to-model pipeline.",
      challenge: {
        heading: "The challenge",
        body: "Since late 2022, Stardock has partnered with TransPerfect Games to develop high-quality 3D spaceship models for Sins of a Solar Empire II, the follow-up to the acclaimed real-time strategy series. In mid-2024, Stardock asked if we could dramatically increase production: 14 brand-new 3D spaceship models and 14 accompanying 2D concept designs, all delivered within a single month. Given the previous pace and scope, the client understood such high-volume delivery would be challenging.",
      },
      solution: {
        heading: "Our solution",
        body: "TransPerfect Games mobilized quickly. What had been a small two-artist team scaled up significantly, with the art director and lead artist restructuring the project plan and reassigning talent internally. Key actions included rapid resource allocation across concept and 3D production, an integrated concept-to-modeling pipeline with teams in tight alignment, and responsive communication through regular updates and feedback loops with Stardock.",
      },
      result: {
        heading: "The result",
        body: "Despite the expanded scope, our structured approach and focused execution ensured all 14 2D concept designs and 14 3D spaceship models were completed on time without compromising quality. All work met or exceeded Stardock's quality standards and delivery expectations, and the client expressed strong praise for the flexibility and performance shown.",
      },
      stats: [
        { label: "3D spaceship models", value: "14", caption: "Delivered on time" },
        { label: "2D concept designs", value: "14", caption: "Concept-to-model pipeline" },
        { label: "Delivery window", value: "1", unit: " month", caption: "From expanded brief" },
        { label: "Partnership since", value: "2022", caption: "Ongoing art production" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Two-artist team scaled rapidly for peak demand",
          "Art director led plan restructure and reassignment",
          "Integrated concept-to-3D production pipeline",
          "Weekly feedback loops with the client's art team",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroStardock.url, aspect: "fill", heightPct: 44, focalY: 45 },
    },
  },
  {
    slug: "team17-global-localization",
    title: "A Partnership Founded on Trust with Team17",
    teaser: "Nine-plus languages across The Escapists, Worms, Overcooked, and more.",
    collection: C_LOC,
    tags: ["localization", "indie", "long-term partnership", "LQA"],
    sourceFile: "TPGames_CaseStudy_Team17.pdf",
    content: {
      eyebrow: "Case study",
      client: "Team17",
      industry: "Indie games publishing",
      audience: "Localization producers",
      summary:
        "From a first collaboration on The Escapists to trusted language partner across Team17's biggest hits.",
      challenge: {
        heading: "The challenge",
        body: "Team17 has proven itself the uncrowned king of indie games with an endless string of catchy, timeless hits — from quirky multiplayer casual games to innovative twists on classic platformers. To build on its global appeal and create more immersive experiences for gamers worldwide, Team17 sought the help of TransPerfect Games' localization and linguistic teams.",
      },
      solution: {
        heading: "A partnership founded on trust",
        body: "TransPerfect Games quickly established itself as a trustworthy partner with the pair's premier collaboration on the 2014 title The Escapists. Its success proved us not just a cost-effective vendor with dependable turnaround times, but a valuable part of the production process whose teams truly understand the language of great games. That led to support across a wide range of titles including Aven Colony, Planet Alpha, Worms, Sheltered, My Time at Portia, and Overcooked.",
      },
      result: {
        heading: "Building global audiences",
        body: "When your games have as much universal appeal as Team17's, you want to reach as wide an audience as possible. Our linguistic teams have translated Team17's games into more than nine languages, ensuring their hit games of tomorrow have every advantage in capturing the hearts and imaginations of gamers everywhere.",
      },
      quote: {
        text: "They make sure they understand the texts you send to them by using query logs and deliver their translation to the highest quality. They are always responsive and quick to gather their resources for you, and they will go the extra mile.",
        author: "Lélia Peuchamiel",
        role: "Producer",
        company: "Team17",
      },
      stats: [
        { label: "Languages translated", value: "9+", caption: "Across the catalogue" },
        { label: "Partnership since", value: "2014", caption: "Starting with The Escapists" },
        { label: "Flagship titles supported", value: "6+", caption: "Including Overcooked" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Query logs used to lock source intent before translation",
          "Consistent turnaround across a broad catalogue",
          "Scaled from a single title to franchise-wide support",
          "Cost-effective delivery without quality trade-offs",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroTeam17.url, aspect: "fill", heightPct: 44, focalY: 45 },
    },
  },
  {
    slug: "tilting-point-localization-lqa",
    title: "Localization at Scale for Tilting Point",
    teaser: "100+ projects across 12 language combinations since 2016.",
    collection: C_LOC,
    tags: ["localization", "LQA", "player support", "free-to-play"],
    sourceFile: "TPGames_CaseStudy_TiltingPoint.pdf",
    content: {
      eyebrow: "Case study",
      client: "Tilting Point",
      industry: "Free-to-play mobile gaming",
      audience: "Deployment operations and localization leads",
      summary:
        "Localization, LQA, and player support for a next-generation publisher branching into new markets.",
      challenge: {
        heading: "The challenge",
        body: "Tilting Point is a next-generation games development and publishing studio that has provided capital, resources, and operational and development support to an impressive array of free-to-play games since 2012. In its mission to branch into newer markets and drive in-game spend and retention, Tilting Point reached out to TransPerfect Games as a provider of world-class localization.",
      },
      solution: {
        heading: "Our solution",
        body: "Since March 2016, TransPerfect Games has collaborated on over 100 Tilting Point localization projects across 12 language combinations, including Horse Racing Manager, Photo Finish, Siege, TerraGenesis, Warhammer: Chaos and Conquest, Zombieland: Double Tapper, and SpongeBob: Krusty Cook-Off.",
      },
      result: {
        heading: "Partnership built on trust",
        body: "The outstanding success of the collaboration — and the overwhelmingly positive player reception to the quality of localized content — led to TransPerfect Games being entrusted with a wide range of Tilting Point projects spanning localization, LQA testing, and player support.",
      },
      quote: {
        text: "Their ability to scale with our demand and maintain their quality standards has allowed us to provide a top-quality experience to users around the world. For localization, support, and LQA needs, TransPerfect Games is a clear leader in the industry.",
        author: "Steve Melanson",
        role: "Deployment Operations Producer",
        company: "Tilting Point",
      },
      stats: [
        { label: "Localization projects", value: "100+", caption: "Since March 2016" },
        { label: "Language combinations", value: "12", caption: "Across the portfolio" },
        { label: "Service lines", value: "3", caption: "Localization, LQA, player support" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Elastic capacity matched to publishing cadence",
          "LQA testing folded into the localization program",
          "Player support added as trust grew",
          "Consistent quality across a broad F2P portfolio",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroTiltingPoint.url, aspect: "fill", heightPct: 42, focalY: 45 },
    },
  },
  {
    slug: "tripwire-localization-voiceover",
    title: "Building & Growing Together with Tripwire Interactive",
    teaser: "250+ localization projects across five flagship titles, plus voiceover and casting.",
    collection: C_LOC,
    tags: ["localization", "voiceover", "casting", "console"],
    sourceFile: "TGS_CaseStudy_TripWire.pdf",
    content: {
      eyebrow: "Case study",
      client: "Tripwire Interactive",
      industry: "PC & console gaming",
      audience: "Publishing and localization leads",
      summary:
        "Expanding a best-selling catalogue across Europe and Asia with localized content and fully localized audio.",
      challenge: {
        heading: "The challenge",
        body: "As a developer and publisher of well-loved, best-selling gaming media, Tripwire Interactive sought TransPerfect Gaming's services in March 2016 to help expand its impact and audience across Europe and Asia — answering the call from gamers for a more immersive experience in a language they could understand.",
      },
      solution: {
        heading: "Our solution",
        body: "Through careful study of the world, tone, genre, and aims of each project, our language teams created world-class localized content in German, Spanish, French, Russian, and Japanese, opening the door to far more diverse gaming audiences. To date we have collaborated on five flagship titles: Killing Floor 2, Rising Storm 2 – Vietnam, Road Redemption, Chivalry 2, and Maneater.",
      },
      result: {
        heading: "Building & growing together",
        body: "Since the initial collaboration, our language teams have worked on over 250 localization projects across all five titles. Successful collaborations led to extending coverage to voiceover recording and talent casting — vastly improving player experiences across Europe and Asia and letting players immerse themselves in culturally and linguistically accurate game audio free of subtitles.",
      },
      quote: {
        text: "TransPerfect Gaming also understand games. They ask the right questions about the games so that they get to understand the concepts and the mythos of each game and build that into the translations — as well as being able to hunt down people who can handle translation into 1960s-era North Vietnamese dialects!",
        author: "Alan Wilson",
        role: "Vice President",
        company: "Tripwire Interactive",
      },
      stats: [
        { label: "Localization projects", value: "250+", caption: "Across five titles" },
        { label: "Flagship titles", value: "5", caption: "Killing Floor 2 to Maneater" },
        { label: "Languages", value: "5", caption: "DE, ES, FR, RU, JA" },
        { label: "Partnership since", value: "2016", caption: "March" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Deep world, tone, and genre study before translation",
          "Scope extended into voiceover recording and casting",
          "Dialect-level talent sourcing for period settings",
          "Subtitle-free immersion for EU and Asia audiences",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroTripwire.url, aspect: "fill", heightPct: 44, focalY: 45 },
    },
  },
  {
    slug: "xbox-power-on-accessibility",
    title: "Accessible Global Storytelling for Xbox",
    teaser: "Captioning, subtitling, and audio description in 30+ languages for Power On: The Story of Xbox.",
    collection: C_PORTING,
    tags: ["accessibility", "subtitling", "audio description", "docuseries"],
    sourceFile: "TPGames_CaseStudy_Xbox.pdf",
    content: {
      eyebrow: "Case study",
      client: "Xbox",
      industry: "Gaming & entertainment media",
      audience: "Global marketing and accessibility leads",
      summary:
        "Premium captioning, subtitling, and audio description that carried a six-part Xbox docuseries to international fans.",
      challenge: {
        heading: "The challenge",
        body: "Xbox released its docuseries Power On: The Story of Xbox, a six-part series taking viewers behind the scenes of Xbox's 20-year history, to emphasize the importance of gaming communities and fans worldwide. To achieve this, Xbox invested in premium captioning, subtitling, and audio descriptions in multiple languages.",
      },
      solution: {
        heading: "Our solution",
        body: "Xbox chose TransPerfect for the benefits of our integrated technology, services, and capabilities supporting accessibility and inclusion across 30+ languages. Through collaboration with production hubs worldwide and linguistic specialists experienced in similar content, TransPerfect created a global solution combining cloud-based and in-studio approaches. Final versions in all languages were delivered on time and within budget.",
      },
      result: {
        heading: "The result",
        body: "By working with TransPerfect, the Xbox Global Experimental Marketing Team successfully integrated accessibility and inclusion into their international engagement strategy. The docuseries has garnered more than 8.5 million views on YouTube since its December 2021 release, with international audiences playing a significant role — and the partnership has led to ongoing collaboration on additional languages and other projects.",
      },
      stats: [
        { label: "Languages supported", value: "30+", caption: "Captions, subtitles, AD" },
        { label: "YouTube views", value: "8.5M+", caption: "Since December 2021" },
        { label: "Episodes localized", value: "6", caption: "Full docuseries" },
        { label: "Delivery", value: "On time", caption: "And within budget" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Premium captioning, subtitling, and audio description",
          "Hybrid cloud and in-studio production model",
          "Global production hubs and specialist linguists",
          "Accessibility embedded in the marketing strategy",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroXbox.url, aspect: "fill", heightPct: 44, focalY: 35 },
    },
  },
];
