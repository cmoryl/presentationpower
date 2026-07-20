import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

type QA = { q: string; a: string };

const GUIDES: Array<{ title: string; blurb: string; steps: string[] }> = [
  {
    title: "Sign in for the first time",
    blurb: "Get into the workspace and set yourself up.",
    steps: [
      "Open the app and click Sign in on the header.",
      "Enter your TransPerfect email and password, or use the magic-link option.",
      'Check "Remember me on this device" so your email pre-fills next time.',
      "On first confirmed sign-in, @transperfect.com addresses are granted admin automatically.",
    ],
  },
  {
    title: "Build your first deck from a brief",
    blurb: "Go from prospect brief to a review-ready deck in under a minute.",
    steps: [
      "Go to Brief → New from the top navigation.",
      "Fill in prospect name, industry, and the objective for the meeting.",
      "Review the suggested archetype — swap it if a different narrative fits better.",
      "Let the system draft module variants; scan the outline in the right rail.",
      "Click Assemble deck to open the full deck in the Decks workspace.",
    ],
  },
  {
    title: "Personalize and swap module variants",
    blurb: "Fine-tune any slide without losing your content.",
    steps: [
      "Open the deck and select a module from the left rail.",
      'Click "Swap variant" to see alternate layouts for the same narrative purpose.',
      "Edit copy directly in the slide preview — structured fields save on blur.",
      'Use "Personalize" to rewrite copy for the current prospect and industry.',
      "Reorder modules by dragging their handle in the outline.",
    ],
  },
  {
    title: "Import an existing PowerPoint",
    blurb: "Bring a legacy .pptx into the modular system.",
    steps: [
      "Go to Decks → Import.",
      "Drop your .pptx file or click to browse.",
      "Wait for the parse — text and structure are auto-mapped to module variants.",
      "Review the mapping; override any mis-matched slide by picking a different variant.",
      "Click Assemble to create a deck you can personalize and export.",
    ],
  },
  {
    title: "Export a deck to PowerPoint",
    blurb: "Ship a branded .pptx to your prospect.",
    steps: [
      "Open the deck from Decks.",
      "Click Export in the top-right of the deck workspace.",
      "Wait for the .pptx to generate — a download starts automatically.",
      "Open in PowerPoint or Keynote; the file matches TransPerfect's visual system.",
    ],
  },
  {
    title: "Share a deck view-only",
    blurb: "Send a colleague a live link without giving them edit access.",
    steps: [
      "Open the deck and click Share in the top-right.",
      "Generate a link — optionally set an expiry.",
      "Copy the /share/$token URL and send it.",
      "Track views over time in /analytics; revoke or regenerate the token at any point.",
    ],
  },
  {
    title: "Translate a deck",
    blurb: "Produce a localized version of a deck without touching the source.",
    steps: [
      "Open the deck and click Translate to open the drawer.",
      "Pick target languages; jobs run via the AI/GlobalLink engine.",
      "Use the language switcher in the toolbar to preview overlays live.",
      "Retry any failed slide from the job history, then export a localized PPTX or PDF.",
    ],
  },
  {
    title: "Rebrand an existing deck",
    blurb: "Retone every slide to a different brand mode.",
    steps: [
      "Open the deck and choose Rebrand in the editor toolbar.",
      "Pick the target brand mode and preview it live across all slides.",
      "Commit — an auto-snapshot is written to version history for rollback.",
    ],
  },
  {
    title: "Review, comment, and approve",
    blurb: "Move a deck through the review workflow with your team.",
    steps: [
      "Open the deck and open the Comments panel on any slide.",
      "Leave threaded comments — reviewers get RLS-scoped access.",
      "Use ReviewStatusControl to move Draft → In review → Approved.",
      "Use Version history to compare and restore any snapshot non-destructively.",
    ],
  },
  {
    title: "Configure GlobalLink (admin)",
    blurb: "Wire up the translation connector for the workspace.",
    steps: [
      "Go to Admin → GlobalLink.",
      "Set the API base URL, project code, and callback secret; add the API key as a secret.",
      "Save the settings — the status badge flips to Connected once the required secrets are present.",
      "Click Test connection to probe the API and confirm the credentials.",
    ],
  },
  {
    title: "Sync Oracle KB into Knowledge (admin)",
    blurb: "Promote a vetted Oracle entry into the live Knowledge system.",
    steps: [
      "Go to Admin → Oracle KB.",
      "Search or filter for the entry you want to promote.",
      'Open the entry and click "Sync to Knowledge".',
      "Review the mapped fields and confirm; the entry becomes searchable app-wide.",
    ],
  },
];


const FAQS: Array<{ section: string; items: QA[] }> = [
  {
    section: "Getting started",
    items: [
      {
        q: "What is TransPerfect Modular?",
        a: "A modular slide directory and AI-assisted deck assembler for TransPerfect sales enablement. Build decks from vetted module variants, personalize them by industry and prospect, and export to PowerPoint.",
      },
      {
        q: "Who can access the app?",
        a: "Anyone with a TransPerfect email can sign up. Admin privileges are granted automatically for @transperfect.com addresses on first confirmed sign-in.",
      },
      {
        q: "How do I build my first deck?",
        a: "Start from Brief → New. Fill in prospect, industry, and objective; the system suggests an archetype and drafts module variants you can review, swap, and personalize before exporting.",
      },
    ],
  },
  {
    section: "Modules & decks",
    items: [
      {
        q: "What is a module variant?",
        a: "A single vetted slide layout tied to a narrative purpose — e.g. cover, pillars, proof point, quote, closing. Every variant renders from structured content, so swapping variants keeps your data intact.",
      },
      {
        q: "Can I import an existing PowerPoint?",
        a: "Yes. Use Decks → Import to upload a .pptx. Text and structure are parsed server-side, auto-mapped to variants, and shown for review before assembly.",
      },
      {
        q: "How do I export to PowerPoint?",
        a: "Open any deck and click Export. The system generates a branded .pptx that matches TransPerfect's visual system.",
      },
    ],
  },
  {
    section: "Knowledge & Oracle",
    items: [
      {
        q: "What's the difference between Knowledge and Oracle KB?",
        a: "Knowledge is the app's live entry system used by search, briefs, and generation. Oracle KB is a read-only imported snapshot from BrandHub. Admins can sync individual Oracle entries into Knowledge from Admin → Oracle KB.",
      },
      {
        q: "Where does brand intelligence come from?",
        a: "The brand_intelligence table holds per-entity summaries imported from BrandHub. It powers the Oracle overview but does not drive generation.",
      },
    ],
  },
  {
    section: "Account & admin",
    items: [
      {
        q: "How do I stay signed in?",
        a: 'Check "Remember me on this device" at sign-in. Your email will be pre-filled next time.',
      },
      {
        q: "How do I get admin access?",
        a: "Ask an existing workspace admin from Admin → Users. TransPerfect email addresses receive admin automatically once their email is confirmed.",
      },
      {
        q: "Can I install this as an app?",
        a: 'Yes. On iOS use Safari → Share → "Add to Home Screen". On Android/desktop Chrome, use the install icon in the address bar. Works offline is not supported.',
      },
    ],
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Frequently asked questions about TransPerfect Modular: building decks, importing PowerPoint, knowledge and Oracle, admin, and installation.",
      },
      { property: "og:title", content: "FAQ · TransPerfect Modular" },
      {
        property: "og:description",
        content:
          "Frequently asked questions about TransPerfect Modular: building decks, importing PowerPoint, knowledge and Oracle, admin, and installation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.flatMap((s) =>
            s.items.map((qa) => ({
              "@type": "Question",
              name: qa.q,
              acceptedAnswer: { "@type": "Answer", text: qa.a },
            })),
          ),
        }),
      },
    ],
  }),
  component: FAQPage,
});

function FAQPage() {
  return (
    <AppShell>
      <div className="flex items-baseline justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-black/50">Support</div>
          <h1 className="mt-3 text-4xl font-semibold">Frequently asked questions</h1>
          <p className="mt-3 max-w-2xl text-black/60">
            Answers about building decks, importing PowerPoint, the knowledge system, and administration. Can't find
            what you need?{" "}
            <Link to="/knowledge" className="font-medium text-[#003FC7] hover:underline">
              Browse the knowledge base
            </Link>
            .
          </p>
        </div>
        <Link
          to="/"
          className="rounded-full border border-black/15 px-4 py-2.5 text-sm text-black/70 hover:border-black/40"
        >
          ← Home
        </Link>
      </div>

      <div className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[#003FC7]">Step-by-step basics</h2>
          <span className="text-xs text-black/40">{GUIDES.length} guides</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {GUIDES.map((g, gi) => (
            <article
              key={g.title}
              className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#003FC7] text-xs font-semibold text-white">
                  {String(gi + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold text-black/90">{g.title}</h3>
              </div>
              <p className="mt-2 text-sm text-black/60">{g.blurb}</p>
              <ol className="mt-4 space-y-2 text-sm text-black/75">
                {g.steps.map((s, si) => (
                  <li key={si} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 text-xs font-semibold tabular-nums text-[#003FC7]">
                      {si + 1}.
                    </span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-14">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[#003FC7]">Common questions</h2>
      </div>

      <div className="mt-4 space-y-10">
        {FAQS.map((section) => (
          <section key={section.section}>
            <h3 className="text-sm font-semibold text-black/80">{section.section}</h3>
            <div className="mt-3 divide-y divide-black/10 overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
              {section.items.map((qa, i) => (
                <details key={i} className="group open:bg-black/[0.02]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left">
                    <span className="text-base font-medium text-black/90">{qa.q}</span>
                    <span
                      aria-hidden
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-black/15 text-black/60 transition group-open:rotate-45 group-open:border-[#003FC7] group-open:text-[#003FC7]"
                    >
                      +
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-sm leading-relaxed text-black/70">{qa.a}</div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
