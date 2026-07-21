// Case-study library. Each entry is tagged so the assembler can pick a
// study that matches the selected brand's contentScope.caseStudyTags.
// When no tags overlap, the picker falls back to a neutral corporate story.

import { BRAND_PROFILES } from "@/lib/brand-profiles";

export type CaseStudy = {
  id: string;
  client: string;
  industry: string;
  tags: string[];
  headline: string;
  challenge: string;
  solution: string;
  result: string;
  metric: string;
  story: string;
  quote: string;
  attribution: string;
  role: string;
  stats: Array<{ value: string; unit: string; label: string; source?: string }>;
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "cs-lifesci-regulated",
    client: "Global life-sciences leader",
    industry: "Life Sciences",
    tags: ["clinical-trial", "regulatory", "fda-ema", "pharma", "regulated", "multilingual-content"],
    headline: "From 28 vendors to one program in two quarters.",
    challenge: "Localized 4,000+ regulated documents / year across 28 markets with fragmented reviewer workflows.",
    solution: "Managed program with AI-assisted QA, single intake, and reviewer workbench.",
    result: "38% faster launches, zero regulatory reopenings.",
    metric: "38% ↓ time to market",
    story:
      "The team managed 28 in-market vendors, each with its own SLA. The fix wasn't more vendors — it was one program that carried the brief and terminology through review. Two quarters later they were on a single system of record with reviewers who saw context on day one.",
    quote: "We were spending more time chasing files than shipping content.",
    attribution: "VP, Global Regulatory Affairs",
    role: "Fortune 500 life sciences",
    stats: [
      { value: "38", unit: "%", label: "faster launches", source: "Program data, 2025" },
      { value: "0", unit: "", label: "regulatory reopenings", source: "Audit log, 2025" },
      { value: "22", unit: "%", label: "lower program cost", source: "Finance review, 2024" },
    ],
  },
  {
    id: "cs-dataforce-llm",
    client: "Frontier AI lab",
    industry: "AI / ML",
    tags: ["ai-training", "annotation", "llm", "speech", "computer-vision", "platform"],
    headline: "Training-grade multilingual data across 42 languages in 90 days.",
    challenge: "Needed instruction-tuned datasets in 42 languages with human preference ranking at frontier scale.",
    solution: "DataForce sourced 6,200 specialist annotators, ran calibrated preference workflows, and delivered rolling weekly batches.",
    result: "3.1M ranked pairs delivered on a 90-day window with 98.2% inter-annotator agreement.",
    metric: "3.1M pairs · 42 langs",
    story:
      "The lab needed native-speaker rankings across 42 languages, with a rubric that shifted weekly as the model improved. DataForce ran calibrated cohorts, published live agreement metrics, and swapped rubrics in-flight without losing throughput. The team went from ad-hoc contractors to a governed data supply chain in a quarter.",
    quote: "Every batch we shipped moved eval scores. We stopped hunting for annotators and started shipping models.",
    attribution: "Head of Data",
    role: "Frontier AI lab",
    stats: [
      { value: "3.1", unit: "M", label: "ranked preference pairs", source: "Program dashboard, 2025" },
      { value: "42", unit: "", label: "languages covered", source: "2025" },
      { value: "98.2", unit: "%", label: "inter-annotator agreement", source: "QA report, 2025" },
    ],
  },
  {
    id: "cs-globallink-saas",
    client: "Enterprise SaaS platform",
    industry: "Technology",
    tags: ["platform", "integration", "automation", "self-serve", "developer", "multilingual-content"],
    headline: "Continuous localization wired directly into the release pipeline.",
    challenge: "Weekly product releases in 18 languages were bottlenecked by manual file exchange with translation teams.",
    solution: "GlobalLink connectors into Git and the CMS, with policy-driven auto-routing and in-context review.",
    result: "Localization moved from a release-blocker to a background job — 100% coverage on every release.",
    metric: "0 release delays",
    story:
      "Every release cut used to trigger a translation scramble. After wiring GlobalLink into CI and the CMS, string changes flowed to linguists the moment they merged, and reviewers approved in context — not in spreadsheets. Localization stopped being a milestone on the release plan.",
    quote: "Localization is invisible now. That's the highest praise I can give it.",
    attribution: "VP Engineering",
    role: "Enterprise SaaS",
    stats: [
      { value: "100", unit: "%", label: "release coverage", source: "Release ops, 2025" },
      { value: "18", unit: "", label: "languages in the pipeline", source: "2025" },
      { value: "0", unit: "", label: "release delays from localization", source: "12-month rolling, 2025" },
    ],
  },
  {
    id: "cs-financial-comms",
    client: "Global bank",
    industry: "Financial Services",
    tags: ["regulated", "multilingual-content", "cost-savings", "global-rollout"],
    headline: "Regulated client communications on one program across 22 markets.",
    challenge: "Client-facing regulatory notices needed identical intent across 22 markets with market-specific counsel review.",
    solution: "Single managed program with jurisdiction-aware review paths and one system of record.",
    result: "Notice turnaround down from 6 weeks to 9 days, with a clean audit trail per market.",
    metric: "6 wks → 9 days",
    story:
      "Regulatory notices used to bounce between market counsel, translation vendors, and internal comms for weeks. The program consolidated all three into a single workflow with jurisdiction-aware routing. Notices now ship in nine days with counsel sign-off recorded per market.",
    quote: "We stopped rebuilding the same wheel in every market.",
    attribution: "Head of Client Communications",
    role: "Tier-1 global bank",
    stats: [
      { value: "22", unit: "", label: "markets on one program", source: "2025" },
      { value: "-73", unit: "%", label: "notice turnaround", source: "Ops metrics, 2025" },
      { value: "100", unit: "%", label: "audit coverage", source: "Compliance, 2025" },
    ],
  },
  {
    id: "cs-retail-launch",
    client: "Global retail brand",
    industry: "Retail",
    tags: ["speed-to-market", "cost-savings", "global-rollout", "multilingual-content"],
    headline: "Seasonal launches on one timeline across 14 languages.",
    challenge: "Seasonal campaign copy fragmented across regional agencies, causing launch-day drift market to market.",
    solution: "Central brief, terminology guardrails, and coordinated in-market review — one calendar, one voice.",
    result: "Launches now hit the same day globally, with 24% lower content cost.",
    metric: "-24% cost",
    story:
      "Each season used to be a scramble across regional agencies with different briefs and no shared terminology. A central brief with market adaptation layers put every region on the same launch day, and the cost curve came down as duplication disappeared.",
    quote: "One launch day, one voice, 14 languages.",
    attribution: "Global Brand Director",
    role: "Global retail",
    stats: [
      { value: "14", unit: "", label: "languages on one launch day", source: "2025" },
      { value: "-24", unit: "%", label: "content cost", source: "Finance, 2025" },
      { value: "1", unit: "", label: "launch calendar globally", source: "2025" },
    ],
  },
  {
    id: "cs-legal-ediscovery",
    client: "AmLaw 50 firm",
    industry: "Legal",
    tags: ["ediscovery", "litigation", "regulated", "cross-border", "patent", "compliance", "managed-review"],
    headline: "Cross-border review 3× faster with a defensible audit trail.",
    challenge: "9-jurisdiction antitrust matter with 4.2M documents and rolling productions across four languages.",
    solution: "Managed eDiscovery program with linguistic review teams, TAR-assisted culling, and jurisdiction-aware privilege workflows.",
    result: "Productions on the court's original schedule, with a single privilege log across every language.",
    metric: "3× faster review",
    story:
      "The firm was staring at a schedule that assumed all-English review. A managed program layered linguistic reviewers on top of TAR, so responsiveness and privilege calls happened once — not twice per language. Productions landed on time and privilege was defensible in every jurisdiction.",
    quote: "We stopped losing weeks to translation queues and started running one review.",
    attribution: "Partner, Litigation",
    role: "AmLaw 50 firm",
    stats: [
      { value: "4.2", unit: "M", label: "documents reviewed", source: "Matter dashboard, 2025" },
      { value: "3", unit: "×", label: "faster than parallel-review baseline", source: "Program benchmark, 2025" },
      { value: "9", unit: "", label: "jurisdictions on one privilege log", source: "2025" },
    ],
  },
  {
    id: "cs-media-dubbing",
    client: "Global streaming platform",
    industry: "Media & Entertainment",
    tags: ["streaming", "dubbing", "subtitling", "ott", "access-services", "media", "voice-over"],
    headline: "Day-and-date premieres across 32 languages, dubbed and subtitled.",
    challenge: "Flagship original needed same-day availability in 32 languages with full access services and no dubbing artifacts.",
    solution: "Coordinated dubbing, subtitling, and audio-description production on a single asset pipeline with in-house talent networks.",
    result: "Zero premiere slips across the slate; access-services parity on day one.",
    metric: "32 langs · day one",
    story:
      "The platform's brand promise was 'same day, everywhere.' The show ran a single asset pipeline across dubbing, subs, and AD — same picture lock, same lipsync references, same QC pass. Every language premiered on time with access services built in, not bolted on.",
    quote: "For the first time, day-and-date meant day-and-date in every market.",
    attribution: "Head of Global Localization",
    role: "Streaming platform",
    stats: [
      { value: "32", unit: "", label: "languages dubbed & subtitled", source: "2025" },
      { value: "0", unit: "", label: "premiere delays across the slate", source: "Slate report, 2025" },
      { value: "100", unit: "%", label: "access-services parity", source: "2025" },
    ],
  },
  {
    id: "cs-games-lqa",
    client: "AAA game studio",
    industry: "Gaming",
    tags: ["aaa", "mobile-games", "lqa", "live-service", "esports", "voice-over", "console"],
    headline: "Simship launch across 14 languages, LQA-clean on day one.",
    challenge: "Global simship with a fixed date, weekly build cadence, and voice recording in 8 languages needed to align to picture.",
    solution: "Embedded loc + LQA teams inside the build pipeline, with voice direction and per-locale bug triage.",
    result: "P1 loc bugs down 70% at gold; player review scores held across every locale.",
    metric: "-70% P1 loc bugs",
    story:
      "The old model batched loc after content lock. The new model put loc engineers, LQA, and voice direction inside the build train. Every locale saw the same weekly cut, hit the same P1 gate, and shipped clean on day one.",
    quote: "Locale-specific bugs used to be a launch-week fire. Now they close in the weekly build.",
    attribution: "Executive Producer",
    role: "AAA studio",
    stats: [
      { value: "14", unit: "", label: "languages on simship", source: "2025" },
      { value: "-70", unit: "%", label: "P1 loc bugs at gold", source: "LQA dashboard, 2025" },
      { value: "8", unit: "", label: "languages of voice, lip-synced", source: "2025" },
    ],
  },
  {
    id: "cs-digital-ecommerce",
    client: "Global consumer brand",
    industry: "Retail",
    tags: ["ecommerce", "web-localization", "seo", "campaign", "conversion", "digital-experience"],
    headline: "Multilingual SEO lifted organic revenue 41% in six months.",
    challenge: "Localized storefronts in 12 markets under-indexed on native search terms, capping organic pipeline.",
    solution: "Keyword-driven transcreation, native-language content ops, and per-market schema tuning in one program.",
    result: "Organic sessions +54%, checkout conversion parity with the home market by month five.",
    metric: "+41% organic revenue",
    story:
      "The stores read like translations, not native-market storefronts. A native-keyword rewrite plus per-market schema and PDP transcreation lifted organic sessions, and the checkout gap closed once the top-of-funnel copy matched real search intent.",
    quote: "Our storefronts finally sound like they were written in-market — because they were.",
    attribution: "SVP Digital Commerce",
    role: "Global consumer brand",
    stats: [
      { value: "+41", unit: "%", label: "organic revenue", source: "Analytics, 2025" },
      { value: "+54", unit: "%", label: "organic sessions", source: "Analytics, 2025" },
      { value: "12", unit: "", label: "markets on one program", source: "2025" },
    ],
  },
  {
    id: "cs-trial-interactive-etmf",
    client: "Top-10 CRO",
    industry: "Life Sciences",
    tags: ["etmf", "study-start-up", "investigator-portal", "clinical-operations", "compliance", "clinical-trial"],
    headline: "Study start-up 42% faster with a live eTMF across 120 sites.",
    challenge: "Multi-country oncology trial stalled in start-up: site activation dragged, and TMF completeness lived in spreadsheets.",
    solution: "Trial Interactive eTMF plus investigator portal deployed as the system of record; site activation workflows and reviewer dashboards live from kickoff.",
    result: "First patient in 42% faster than protocol baseline; TMF inspection-ready every day of the trial.",
    metric: "42% faster start-up",
    story:
      "Start-up used to be a spreadsheet war between CRAs, sites, and the TMF team. Trial Interactive put every activation task, document, and site interaction into one live system. FPI hit six weeks ahead of plan and the eTMF was inspection-ready from day one.",
    quote: "The TMF stopped being a milestone. It became the trial's operating system.",
    attribution: "VP Clinical Operations",
    role: "Top-10 CRO",
    stats: [
      { value: "42", unit: "%", label: "faster first patient in", source: "Study dashboard, 2025" },
      { value: "120", unit: "", label: "sites on one investigator portal", source: "2025" },
      { value: "100", unit: "%", label: "TMF inspection readiness", source: "QA log, 2025" },
    ],
  },
  {
    id: "cs-cobrand-partnership",
    client: "Strategic client partnership",
    industry: "Client-specific",
    tags: ["partnership", "joint-gtm", "shared-ownership"],
    headline: "A joint program measured on shared outcomes.",
    challenge: "Two organizations with overlapping content pipelines and different measurement frames.",
    solution: "Co-owned program plan, shared dashboard, and quarterly business reviews with joint targets.",
    result: "Aligned metrics from day one; joint scorecard replaced the finger-pointing that used to happen at QBRs.",
    metric: "1 shared scorecard",
    story:
      "The two teams had run parallel programs for years with separate KPIs. A co-owned plan and a shared dashboard replaced two decks with one. QBRs stopped being about attribution and started being about outcomes.",
    quote: "We finally stopped presenting two versions of reality.",
    attribution: "Program Sponsor",
    role: "Joint program lead",
    stats: [
      { value: "1", unit: "", label: "shared scorecard", source: "2025" },
      { value: "4", unit: "", label: "joint QBRs / year", source: "2025" },
      { value: "100", unit: "%", label: "goal alignment", source: "Program charter, 2025" },
    ],
  },
];

// Score a case study by how many of its tags appear in the target set.
function scoreByTags(cs: CaseStudy, tags: string[], industry?: string): number {
  let score = 0;
  const set = new Set(tags);
  for (const t of cs.tags) if (set.has(t)) score += 2;
  if (industry && cs.industry.toLowerCase() === industry.toLowerCase()) score += 1;
  return score;
}

export function pickCaseStudy(
  brandModeId: string | undefined,
  industry?: string
): CaseStudy {
  const profile = brandModeId ? BRAND_PROFILES[brandModeId] : undefined;
  const targetTags = profile?.contentScope.caseStudyTags ?? [];
  const targetIndustries = profile?.contentScope.industries ?? [];
  const industryHint = industry || targetIndustries[0];

  const ranked = [...CASE_STUDIES]
    .map((cs) => ({ cs, score: scoreByTags(cs, targetTags, industryHint) }))
    .sort((a, b) => b.score - a.score);

  // If nothing matches, return the neutral life-sciences default (first entry).
  return ranked[0]?.cs ?? CASE_STUDIES[0];
}

// Pick a rotating set of proof logos scoped to a brand's industry mix.
export function pickProofLogos(brandModeId: string | undefined): Array<{ name: string }> {
  const profile = brandModeId ? BRAND_PROFILES[brandModeId] : undefined;
  const industries = profile?.contentScope.industries ?? [];
  const base = industries.length
    ? industries.slice(0, 8).map((i) => ({ name: i }))
    : [
        { name: "Life Sciences leader" },
        { name: "Global Bank" },
        { name: "Consumer Tech" },
        { name: "Retail" },
        { name: "Insurance" },
        { name: "Automotive" },
        { name: "Manufacturing" },
        { name: "Media" },
      ];
  while (base.length < 8) base.push({ name: base[base.length % Math.max(base.length, 1)]?.name ?? "Client" });
  return base.slice(0, 8);
}
