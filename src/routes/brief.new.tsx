import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  Presentation,
  CalendarDays,
  Share2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GenerationProgress, type GenJob } from "@/components/GenerationProgress";

import { useDeckStore } from "@/lib/deck-store";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { personalizeSlides } from "@/lib/personalize.functions";
import { retrieveKnowledgeForBrief, abAssign, abLogEvent } from "@/lib/admin.functions";
import { synthesizeKnowledgeForBrief } from "@/lib/ai-rag.functions";
import { createPrintAssetWithBrief } from "@/lib/print-assets.functions";
import { EVENT_PLAYBOOKS } from "@/lib/event-playbooks";
import { SOCIAL_PLAYBOOKS } from "@/lib/social-playbooks";
import { useSignedIn } from "@/components/CloudDeckControls";
import { byId, SECTION_FRAMEWORKS, NARRATIVE_ARCHETYPES } from "@/lib/taxonomy";
import { recordAssetVersion, useAssetVersions } from "@/lib/asset-versions";
import {
  ReferenceAssetUploader,
  type ReferenceAsset,
} from "@/components/ReferenceAssetUploader";
import { analyzeReferenceAssets } from "@/lib/reference-assets.functions";
import { ProspectPanel, type ProspectDetails } from "@/components/ProspectPanel";
import { StructurePreviewPanel } from "@/components/brief/StructurePreviewPanel";
import { buildStructurePreviews } from "@/lib/brief-structure-preview";
import { validateBrief } from "@/lib/brief-validation";



export const Route = createFileRoute("/brief/new")({
  head: () => ({
    meta: [
      { title: "New master brief · TransPerfect Modular" },
      {
        name: "description",
        content:
          "One prompt · full brand set. Describe the opportunity, pick what to make, generate the deck and every companion artifact.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: BriefCommandCenter,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">Brief failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

function BriefCommandCenter() {
  const navigate = useNavigate();
  const create = useDeckStore((s) => s.createBriefAndAssemble);
  const setDeckContext = useDeckStore((s) => s.setDeckContext);
  const applyAi = useDeckStore((s) => s.applyAiContent);
  const decks = useDeckStore((s) => s.decks);
  const personalize = useServerFn(personalizeSlides);
  const retrieveKnowledge = useServerFn(retrieveKnowledgeForBrief);
  const synthesizeKnowledge = useServerFn(synthesizeKnowledgeForBrief);
  const assignVariantFn = useServerFn(abAssign);
  const logAbEventFn = useServerFn(abLogEvent);
  const { brandModes, narrativeArchetypes } = useTaxonomy();
  const signedIn = useSignedIn();
  const createPrintAssetFn = useServerFn(createPrintAssetWithBrief);
  const analyzeReferencesFn = useServerFn(analyzeReferenceAssets);

  const [aiStatus, setAiStatus] = useState<
    "idle" | "assembling" | "knowledge" | "personalizing" | "error"
  >("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);

  // ---- Live per-asset generation tracking --------------------------------
  const [jobs, setJobs] = useState<GenJob[]>([]);
  const startJobs = (list: Array<{ id: string; label: string; detail?: string }>) =>
    setJobs(list.map((j) => ({ ...j, status: "pending" as const })));
  const patchJob = (id: string, patch: Partial<GenJob>) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  const [referenceSummary, setReferenceSummary] = useState<{
    accepted: string[];
    rejected: string[];
  } | null>(null);

  // Clear the reference analysis summary whenever files change.
  const setReferenceAssetsAndClearSummary = (next: ReferenceAsset[]) => {
    setReferenceAssets(next);
    if (referenceSummary) setReferenceSummary(null);
  };

  const [prompt, setPrompt] = useState("");
  // Guided wizard: one section on screen at a time so the page reads as a
  // sequence of decisions instead of one long wall of options.
  const [step, setStep] = useState(1);
  const [prospectDetails, setProspectDetails] = useState<ProspectDetails>({
    prospect: "",
    industry: "",
    audience: "Decision makers",
    relationship: "new",
    meetingObjective: "",
    knownFacts: "",
  });
  const prospect = prospectDetails.prospect;

  const [brandModeId, setBrandModeId] = useState<string>(
    brandModes.find((b) => b.id === "bm-enterprise")?.id ?? brandModes[0]?.id ?? "bm-enterprise",
  );

  type PrintKind = "case-study" | "spotlight" | "ebrochure" | "adaptor-brief";
  type MasterSet = {
    presentation: boolean;
    print: { enabled: boolean; kinds: PrintKind[] };
    event: { enabled: boolean; playbookId: string | null };
    social: { enabled: boolean; playbookId: string | null };
  };
  const [masterSet, setMasterSet] = useState<MasterSet>({
    presentation: true,
    print: { enabled: true, kinds: ["case-study"] },
    event: { enabled: false, playbookId: EVENT_PLAYBOOKS[0]?.id ?? null },
    social: { enabled: false, playbookId: SOCIAL_PLAYBOOKS[0]?.id ?? null },
  });

  const brand = useMemo(
    () => brandModes.find((b) => b.id === brandModeId) ?? brandModes[0],
    [brandModes, brandModeId],
  );
  const brandPrimary = brand?.tokens?.primary || "#003FC7";
  const brandAccent = brand?.tokens?.accent || "#A1FBF9";

  type Destination =
    | "presentation"
    | "print:case-study"
    | "print:spotlight"
    | "print:ebrochure"
    | "print:adaptor-brief"
    | "event"
    | "social";
  const isDestOn = (d: Destination): boolean => {
    if (d === "presentation") return masterSet.presentation;
    if (d === "event") return masterSet.event.enabled;
    if (d === "social") return masterSet.social.enabled;
    const kind = d.slice(6) as PrintKind;
    return masterSet.print.enabled && masterSet.print.kinds.includes(kind);
  };
  const toggleDest = (d: Destination) => {
    setMasterSet((prev) => {
      if (d === "presentation") return { ...prev, presentation: !prev.presentation };
      if (d === "event") return { ...prev, event: { ...prev.event, enabled: !prev.event.enabled } };
      if (d === "social")
        return { ...prev, social: { ...prev.social, enabled: !prev.social.enabled } };
      const kind = d.slice(6) as PrintKind;
      const has = prev.print.kinds.includes(kind);
      const nextKinds = has
        ? prev.print.kinds.filter((k) => k !== kind)
        : [...prev.print.kinds, kind];
      return { ...prev, print: { enabled: nextKinds.length > 0, kinds: nextKinds } };
    });
  };

  // ---- Channel (output type) --------------------------------------------
  // Deciding PPT / Print / Event / Social up front is what determines which
  // assets exist at all, so it's the first decision on the page. Channels are
  // derived from `masterSet` so there is a single source of truth.
  type ChannelId = "presentation" | "print" | "event" | "social";
  const CHANNELS: Array<{
    id: ChannelId;
    label: string;
    kicker: string;
    desc: string;
    icon: typeof Presentation;
  }> = [
    {
      id: "presentation",
      label: "Presentation",
      kicker: "PPT / deck",
      desc: "Slide deck for a live meeting — exports to PowerPoint.",
      icon: Presentation,
    },
    {
      id: "print",
      label: "Print",
      kicker: "PDF collateral",
      desc: "Case studies, spotlights, brochures and briefs.",
      icon: FileText,
    },
    {
      id: "event",
      label: "Event",
      kicker: "Onsite",
      desc: "Booth signage, banners and onsite collateral.",
      icon: CalendarDays,
    },
    {
      id: "social",
      label: "Social",
      kicker: "Digital",
      desc: "LinkedIn and Instagram sized post sets.",
      icon: Share2,
    },
  ];
  const isChannelOn = (c: ChannelId): boolean => {
    if (c === "presentation") return masterSet.presentation;
    if (c === "print") return masterSet.print.enabled;
    if (c === "event") return masterSet.event.enabled;
    return masterSet.social.enabled;
  };
  const activeChannels = CHANNELS.filter((c) => isChannelOn(c.id)).map((c) => c.id);
  const toggleChannel = (c: ChannelId) => {
    setMasterSet((prev) => {
      if (c === "presentation") return { ...prev, presentation: !prev.presentation };
      if (c === "event") return { ...prev, event: { ...prev.event, enabled: !prev.event.enabled } };
      if (c === "social")
        return { ...prev, social: { ...prev.social, enabled: !prev.social.enabled } };
      // Turning print on seeds a sensible default artifact; off clears them.
      return prev.print.enabled
        ? { ...prev, print: { enabled: false, kinds: [] } }
        : { ...prev, print: { enabled: true, kinds: ["case-study"] } };
    });
  };

  // ---- Specific-asset request -------------------------------------------
  // A user can describe the one artifact they actually need ("a one-pager for
  // a pharma RFP"). We map that to destinations, auto-produce it in the
  // selected division's style, then hand off for fine-tuning.
  const [assetRequest, setAssetRequest] = useState("");
  const [referenceAssets, setReferenceAssets] = useState<ReferenceAsset[]>([]);
  const {
    versions: assetVersions,
    lastRequest,
    inheritedReferences,
  } = useAssetVersions(assetRequest);
  /**
   * Regenerations reuse the references from the previous version by default.
   * "swap" lets the user attach different files for different guidance.
   */
  const [referenceMode, setReferenceMode] = useState<"reuse" | "swap">("reuse");
  const sameNameSet = (a: string[], b: string[]) =>
    a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");
  /** Cached guidance we can apply verbatim instead of re-running the vision pass. */
  const reusableReferences =
    referenceMode === "reuse" &&
    inheritedReferences &&
    (referenceAssets.length === 0 ||
      sameNameSet(
        referenceAssets.map((a) => a.name),
        inheritedReferences.fileNames,
      ))
      ? inheritedReferences
      : null;


  const REQUEST_RULES: Array<{ match: RegExp; dests: Destination[] }> = [
    { match: /\b(deck|slides?|presentation|pitch|ppt|powerpoint)\b/i, dests: ["presentation"] },
    { match: /\b(case ?study|success story|win story|proof point)\b/i, dests: ["print:case-study"] },
    {
      match: /\b(one[- ]?pager|onepager|spotlight|leave[- ]?behind|flyer|sell ?sheet)\b/i,
      dests: ["print:spotlight"],
    },
    { match: /\b(brochure|ebrochure|booklet|overview doc)\b/i, dests: ["print:ebrochure"] },
    { match: /\b(adaptor|adapter|brief|rfp|rfi|questionnaire)\b/i, dests: ["print:adaptor-brief"] },
    {
      match: /\b(event|booth|conference|onsite|signage|banner|trade ?show)\b/i,
      dests: ["event"],
    },
    {
      match: /\b(social|linkedin|instagram|post|campaign|ad)\b/i,
      dests: ["social"],
    },
  ];

  const matchedDests = useMemo<Destination[]>(() => {
    const text = assetRequest.trim();
    if (!text) return [];
    const hits = new Set<Destination>();
    for (const rule of REQUEST_RULES) {
      if (rule.match.test(text)) rule.dests.forEach((d) => hits.add(d));
    }
    // Nothing recognised → sensible general-purpose default for the division.
    if (hits.size === 0) hits.add("print:spotlight");
    return [...hits];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetRequest]);

  function setFromDestinations(dests: Destination[]): MasterSet {
    const kinds = dests
      .filter((d) => d.startsWith("print:"))
      .map((d) => d.slice(6) as PrintKind);
    const next: MasterSet = {
      presentation: dests.includes("presentation"),
      print: { enabled: kinds.length > 0, kinds },
      event: {
        enabled: dests.includes("event"),
        playbookId: masterSet.event.playbookId ?? EVENT_PLAYBOOKS[0]?.id ?? null,
      },
      social: {
        enabled: dests.includes("social"),
        playbookId: masterSet.social.playbookId ?? SOCIAL_PLAYBOOKS[0]?.id ?? null,
      },
    };
    return next;
  }

  const destLabel = (d: Destination) =>
    ({
      presentation: "Presentation",
      "print:case-study": "Case study",
      "print:spotlight": "Spotlight",
      "print:ebrochure": "eBrochure",
      "print:adaptor-brief": "Adaptor brief",
      event: "Event kit",
      social: "Social kit",
    })[d];

  // Build the submission from the compact command-center inputs. Everything not
  // supplied here uses sensible defaults; the user refines on the deck page.
  function buildSubmission(requestText?: string) {
    const raw = [prompt.trim(), requestText?.trim()].filter(Boolean).join(" — ");
    const forMatch = raw.match(/\bfor\s+([A-Z][\w&.\- ]{1,48})/);
    const typed = prospectDetails.prospect.trim();
    const inferredProspect = typed || (forMatch ? forMatch[1].trim().replace(/[.,]$/, "") : "");
    const defaultArch =
      narrativeArchetypes.find((a) => a.id === "arch-problem-solution")?.id ??
      narrativeArchetypes[0]?.id ??
      "arch-problem-solution";
    const relationshipLabel = (
      {
        new: "Net-new prospect with no prior relationship",
        warm: "Warm or referred lead with some awareness",
        existing: "Existing client — expansion opportunity",
        renewal: "Renewal or at-risk account — defend the relationship",
        rfp: "Formal RFP or scored bid response",
      } as Record<string, string>
    )[prospectDetails.relationship];
    const facts = [
      relationshipLabel ? `Relationship: ${relationshipLabel}.` : "",
      prospectDetails.knownFacts.trim(),
      raw,
    ]
      .filter(Boolean)
      .join("\n");
    return {
      prospect: inferredProspect || "New prospect",
      industry:
        prospectDetails.industry.trim() ||
        brand?.contentScope?.industries?.[0] ||
        "Life sciences",
      audience: prospectDetails.audience.trim() || "Decision makers",
      meetingObjective:
        prospectDetails.meetingObjective.trim() || raw || "Introduce TransPerfect capabilities",
      brandModeId,
      subCompany: "",
      archetypeId: defaultArch,
      lengthTarget: 9,
      clientFacts: facts,

      abExperimentId: null as string | null,
      abVariantId: null as string | null,
      abPaletteOverride: null as Record<string, string> | null,
    };
  }

  async function expandMasterSet(
    deckId: string,
    submission: {
      prospect: string;
      industry: string;
      audience: string;
      meetingObjective: string;
      clientFacts: string;
    },
    set: MasterSet = masterSet,
    requestText?: string,
  ) {
    setExpanding(true);
    const prints: Array<{ id: string; kind: PrintKind; title: string }> = [];

    if (set.print.enabled && signedIn) {
      for (const kind of set.print.kinds) {
        const jobId = `print:${kind}`;
        patchJob(jobId, { status: "running", detail: "Applying division styling…" });
        try {
          const res = await createPrintAssetFn({
            data: {
              kind,
              title: `${submission.prospect} · ${kind.replace("-", " ")}`,
              brandModeId,
              subCompany: "",
              prospect: submission.prospect,
              industry: submission.industry,
              audience: submission.audience,
              meetingObjective: submission.meetingObjective,
              knownFacts: submission.clientFacts,
              // Links the print asset back to the deck the same brief produced
              // so the editor can offer a way back (local deck ids aren't uuids,
              // so this rides in context rather than source_deck_id).
              context: { siblingDeckId: deckId },
            },
          });
          if (res?.id)
            prints.push({
              id: res.id,
              kind,
              title: res.title ?? `${submission.prospect} · ${kind}`,
            });
          patchJob(jobId, {
            status: "done",
            detail: res?.title ?? `${submission.prospect} · ${kind}`,
          });
        } catch (e) {
          patchJob(jobId, { status: "error", detail: (e as Error).message });
          toast.error(`Print (${kind}) failed: ${(e as Error).message}`);
        }
      }
    }

    if (set.event.enabled && set.event.playbookId) {
      patchJob("event", { status: "running", detail: "Linking event playbook…" });
    }
    if (set.social.enabled && set.social.playbookId) {
      patchJob("social", { status: "running", detail: "Linking social playbook…" });
    }


    setDeckContext(deckId, {
      masterSet: {
        eventPlaybookId: set.event.enabled ? set.event.playbookId : null,
        socialPlaybookId: set.social.enabled ? set.social.playbookId : null,
        printAssetIds: prints.map((p) => p.id),
        printAssets: prints.map((p) => ({ id: p.id, kind: p.kind, title: p.title })),
        brandDivisionId: brand?.id ?? null,
      },
      ...(requestText?.trim()
        ? {
            assetRequest: {
              text: requestText.trim(),
              matched: matchedDests.map((d) => destLabel(d)),
              createdAt: new Date().toISOString(),
            },
          }
        : {}),
    });
    if (set.event.enabled && set.event.playbookId)
      patchJob("event", { status: "done", detail: "Event kit linked" });
    if (set.social.enabled && set.social.playbookId)
      patchJob("social", { status: "done", detail: "Social kit linked" });
    setExpanding(false);


    const parts: string[] = ["Deck"];
    if (prints.length) parts.push(`${prints.length} print asset${prints.length > 1 ? "s" : ""}`);
    if (set.event.enabled && set.event.playbookId) parts.push("event kit");
    if (set.social.enabled && set.social.playbookId) parts.push("social kit");
    toast.success(`Master set ready · ${parts.join(" · ")}`);
  }


  // Every artifact the current selection will produce, as trackable jobs.
  function buildJobPlan(set: MasterSet) {
    const plan: Array<{ id: string; label: string; detail?: string }> = [
      { id: "deck", label: "Narrative deck", detail: "Assembling slide structure" },
      ...(referenceAssets.length || reusableReferences
        ? [
            {
              id: "references",
              label: "Reference assets",
              detail: referenceAssets.length
                ? `${referenceAssets.length} file${referenceAssets.length > 1 ? "s" : ""}: ${referenceAssets.map((a) => a.name).join(", ")}`
                : `Reusing ${reusableReferences!.fileNames.length} from the previous version`,
            },
          ]
        : []),
      { id: "knowledge", label: "Knowledge context", detail: "Retrieving proof points" },
      { id: "personalize", label: "AI personalization", detail: "Writing slide copy" },
    ];
    if (set.print.enabled)
      for (const kind of set.print.kinds)
        plan.push({
          id: `print:${kind}`,
          label: destLabel(`print:${kind}` as Destination) ?? kind,
          detail: "Queued for production",
        });
    if (set.event.enabled && set.event.playbookId)
      plan.push({ id: "event", label: "Event kit", detail: "Queued" });
    if (set.social.enabled && set.social.playbookId)
      plan.push({ id: "social", label: "Social kit", detail: "Queued" });
    return plan;
  }

  async function generateWithAi(opts?: { set?: MasterSet; request?: string }) {
    setAiError(null);
    setAiStatus("assembling");
    const scope = brand?.contentScope;
    const activeSet = opts?.set ?? masterSet;

    startJobs(buildJobPlan(activeSet));
    patchJob("deck", { status: "running" });

    const submission = buildSubmission(opts?.request);

    // A/B experiment support removed from the simplified surface.
    void assignVariantFn;
    void logAbEventFn;
    const { deckId } = create(submission);
    const deck = useDeckStore.getState().decks[deckId] ?? decks[deckId];
    if (!deck) {
      navigate({ to: "/decks/$deckId", params: { deckId } });
      return;
    }
    patchJob("deck", { status: "done", detail: `${deck.slides.length} slides assembled` });

    setAiStatus("knowledge");
    patchJob("knowledge", { status: "running", detail: "Searching knowledge base…" });

    let knowledgeSnippets: Array<{
      source: "oracle" | "kb" | "asset" | "brand-intel" | "synthesis";
      title: string;
      snippet: string;
      tags: string[];
      id: string;
    }> = [];
    let synthesisText: string | null = null;
    const kbTagsBundle = [
      ...(scope?.industries ?? []),
      ...(scope?.serviceLines ?? []),
      ...(scope?.caseStudyTags ?? []),
    ];
    try {
      const synth = await synthesizeKnowledge({
        data: {
          industry: submission.industry,
          audience: submission.audience,
          meetingObjective: submission.meetingObjective,
          clientFacts: submission.clientFacts,
          brandName: brand?.name ?? null,
          divisionId: brand?.id ?? null,
          brandTags: kbTagsBundle,
          limit: 6,
        },
      });
      if (synth.ok) {
        synthesisText = synth.synthesis ?? null;
        knowledgeSnippets = synth.selected.map((k) => ({
          id: k.id,
          source: k.source as "oracle" | "kb" | "asset" | "brand-intel",
          title: k.title,
          snippet: k.snippet,
          tags: k.tags,
        }));
      }
    } catch {
      /* fall through */
    }

    if (!knowledgeSnippets.length) {
      try {
        const kbRes = await retrieveKnowledge({
          data: {
            industry: submission.industry,
            audience: submission.audience,
            meetingObjective: submission.meetingObjective,
            clientFacts: submission.clientFacts,
            brandName: brand?.name ?? null,
            divisionId: brand?.id ?? null,
            brandTags: kbTagsBundle,
            limit: 6,
          },
        });
        knowledgeSnippets = kbRes as typeof knowledgeSnippets;
      } catch {
        /* non-fatal */
      }
    }

    setDeckContext(deckId, {
      knowledgeSourceIds: knowledgeSnippets.map((k) => k.id),
      knowledgeSources: knowledgeSnippets.map((k) => ({
        id: k.id,
        source: k.source,
        title: k.title,
        tags: k.tags,
        snippet: k.snippet,
        extractedFact: k.snippet,
      })),
      knowledgeSynthesis: synthesisText,
    });
    patchJob("knowledge", {
      status: "done",
      detail: knowledgeSnippets.length
        ? `${knowledgeSnippets.length} source${knowledgeSnippets.length > 1 ? "s" : ""} linked`
        : "No matching sources — using brief only",
    });


    const personalizerKb: Array<{
      source: "oracle" | "kb" | "asset" | "brand-intel";
      title: string;
      snippet: string;
      tags: string[];
    }> = knowledgeSnippets
      .filter((k) => k.source !== "synthesis")
      .map((k) => ({
        source: k.source as "oracle" | "kb" | "asset" | "brand-intel",
        title: k.title,
        snippet: k.snippet,
        tags: k.tags,
      }));
    if (synthesisText) {
      personalizerKb.unshift({
        source: "kb",
        title: "Brief-specific knowledge synthesis",
        snippet: synthesisText,
        tags: ["synthesis"],
      });
    }

    // Reference assets → vision pass → guidance that steers the copy writer.
    // Regenerating the same request reuses the previous version's guidance
    // verbatim unless the user swapped in different files.
    let appliedReferences: { fileNames: string[]; guidance: string } | null = null;

    if (reusableReferences) {
      personalizerKb.unshift({
        source: "asset",
        title: "Reference assets · style & tone guidance",
        snippet: reusableReferences.guidance,
        tags: ["reference", ...reusableReferences.fileNames],
      });
      setDeckContext(deckId, {
        referenceGuidance: {
          guidance: reusableReferences.guidance,
          fileNames: reusableReferences.fileNames,
          createdAt: new Date().toISOString(),
        },
      });
      appliedReferences = reusableReferences;
      setReferenceSummary({ accepted: reusableReferences.fileNames, rejected: [] });
      patchJob("references", {
        status: "done",
        detail: `Reused ${reusableReferences.fileNames.length} reference${
          reusableReferences.fileNames.length > 1 ? "s" : ""
        } from the previous version`,
      });
    } else if (referenceAssets.length) {
      patchJob("references", {
        status: "running",
        detail: `Analysing ${referenceAssets.length} reference${referenceAssets.length > 1 ? "s" : ""}…`,
      });
      try {
        const res = await analyzeReferencesFn({
          data: {
            request: opts?.request ?? prompt,
            brandName: brand?.name ?? null,
            files: referenceAssets.map((r) => ({
              name: r.name,
              mimeType: r.mimeType,
              dataUrl: r.dataUrl,
            })),
          },
        });
        if (res.ok) {
          personalizerKb.unshift({
            source: "asset",
            title: "Reference assets · style & tone guidance",
            snippet: res.guidance,
            tags: ["reference", ...res.fileNames],
          });
          setDeckContext(deckId, {
            referenceGuidance: {
              guidance: res.guidance,
              fileNames: res.fileNames,
              createdAt: new Date().toISOString(),
            },
          });
          appliedReferences = { fileNames: res.fileNames, guidance: res.guidance };
          setReferenceSummary({
            accepted: res.fileNames,
            rejected: referenceAssets
              .filter((a) => !res.fileNames.includes(a.name))
              .map((a) => a.name),
          });
          patchJob("references", {
            status: "done",
            detail: `${res.fileNames.length} reference${res.fileNames.length > 1 ? "s" : ""} applied`,
          });
        } else {
          setReferenceSummary({ accepted: [], rejected: referenceAssets.map((a) => a.name) });
          patchJob("references", { status: "error", detail: res.error });
          toast.error(`Reference analysis failed: ${res.error}`);
        }
      } catch (e) {
        setReferenceSummary({ accepted: [], rejected: referenceAssets.map((a) => a.name) });
        patchJob("references", { status: "error", detail: (e as Error).message });
        toast.error(`Reference analysis failed: ${(e as Error).message}`);
      }
    }


    setAiStatus("personalizing");

    patchJob("personalize", {
      status: "running",
      detail: `Writing copy for ${deck.slides.length} slides…`,
    });
    try {
      const result = await personalize({
        data: {
          brief: {
            prospect: submission.prospect,
            industry: submission.industry,
            audience: submission.audience,
            meetingObjective: submission.meetingObjective,
            clientFacts: submission.clientFacts,
            archetypeName: byId(NARRATIVE_ARCHETYPES, submission.archetypeId)?.name ?? "Deck",
            brandScope: scope
              ? {
                  brandName: brand?.name,
                  role: brand?.role,
                  industries: scope.industries,
                  serviceLines: scope.serviceLines,
                  caseStudyTags: scope.caseStudyTags,
                }
              : undefined,
          },
          slides: deck.slides.map((s) => ({
            id: s.id,
            variantId: s.variantId,
            sectionName: byId(SECTION_FRAMEWORKS, s.sectionId)?.name ?? "",
            content: s.content as Record<string, unknown>,
          })),
          knowledgeSnippets: personalizerKb.slice(0, 12),
        },
      });
      if (result.error) {
        setAiError(result.error);
        setAiStatus("error");
        patchJob("personalize", { status: "error", detail: result.error });
        return;
      }
      applyAi(deckId, result.slides as Array<{ id: string; content: Record<string, unknown> }>);
      patchJob("personalize", { status: "done", detail: "Copy personalized" });
    } catch (e) {
      setAiError((e as Error).message);
      setAiStatus("error");
      patchJob("personalize", { status: "error", detail: (e as Error).message });
      return;
    }
    await expandMasterSet(deckId, submission, activeSet, opts?.request);
    if (opts?.request?.trim()) {
      recordAssetVersion({
        request: opts.request,
        matched: matchedDests.map((d) => destLabel(d)),
        deckId,
        ...(appliedReferences ? { references: appliedReferences } : {}),
      });
    }

    setAiStatus("idle");
    // Land on the brief hub, not a single editor: the user just generated a
    // whole set, so they need to see every artifact grouped by marketing area
    // before diving into one of them.
    navigate({ to: "/brief/$deckId", params: { deckId } });
  }



  async function generateFast() {
    const submission = buildSubmission();
    startJobs(buildJobPlan(masterSet).filter((j) => j.id !== "knowledge" && j.id !== "personalize"));
    patchJob("deck", { status: "running" });
    const { deckId } = create(submission);
    patchJob("deck", { status: "done", detail: "Deck assembled" });
    await expandMasterSet(deckId, submission);
    navigate({ to: "/brief/$deckId", params: { deckId } });
  }


  // "Request a specific asset" → auto-produce it in the selected division's
  // style, then drop the user into the editor to fine-tune (or hand to Copilot).
  async function generateRequestedAsset() {
    const text = assetRequest.trim();
    if (!text || busy) return;
    const set = setFromDestinations(matchedDests);
    setMasterSet(set);
    await generateWithAi({ set, request: text });
  }


  const busy =
    aiStatus === "assembling" || aiStatus === "knowledge" || aiStatus === "personalizing";

  const destinations: Array<{
    id: Destination;
    label: string;
    sub: string;
    group: "Deck" | "Print" | "Digital";
    desc: string;
    output: string;
  }> = [
    {
      id: "presentation",
      label: "Presentation",
      sub: "Deck",
      group: "Deck",
      desc: "Narrative slide deck you can present, share by link, or export to PowerPoint.",
      output: "~10–14 slides",
    },
    {
      id: "print:case-study",
      label: "Case study",
      sub: "Print",
      group: "Print",
      desc: "Challenge · Approach · Outcome proof point with stats and a client quote.",
      output: "2-page PDF",
    },
    {
      id: "print:spotlight",
      label: "Spotlight",
      sub: "Print",
      group: "Print",
      desc: "One-pager leave-behind: hero, capabilities, and the three numbers that matter.",
      output: "1-page PDF",
    },
    {
      id: "print:ebrochure",
      label: "eBrochure",
      sub: "Print",
      group: "Print",
      desc: "Longer marketing overview for web download or a follow-up email.",
      output: "4–6 page PDF",
    },
    {
      id: "print:adaptor-brief",
      label: "Adaptor brief",
      sub: "Print",
      group: "Print",
      desc: "Dark aurora hero plus capability grid — built for RFP and procurement responses.",
      output: "2-page PDF",
    },
    {
      id: "event",
      label: "Event kit",
      sub: "Onsite",
      group: "Digital",
      desc: "Booth signage, banners, and onsite collateral from an event playbook.",
      output: "Sized asset set",
    },
    {
      id: "social",
      label: "Social kit",
      sub: "Digital",
      group: "Digital",
      desc: "LinkedIn and Instagram sized posts that match the deck's story.",
      output: "Sized asset set",
    },
  ];

  const DEST_PRESETS: Array<{ id: string; label: string; hint: string; dests: Destination[] }> = [
    {
      id: "pitch",
      label: "Pitch meeting",
      hint: "Deck + leave-behind",
      dests: ["presentation", "print:spotlight"],
    },
    {
      id: "rfp",
      label: "RFP response",
      hint: "Adaptor brief + case study",
      dests: ["print:adaptor-brief", "print:case-study"],
    },
    {
      id: "campaign",
      label: "Campaign launch",
      hint: "eBrochure + social",
      dests: ["print:ebrochure", "social"],
    },
    {
      id: "event",
      label: "Event",
      hint: "Deck + event kit + social",
      dests: ["presentation", "event", "social"],
    },
  ];

  const selected = destinations.filter((d) => isDestOn(d.id));
  const selectedCount = selected.length;
  const presetIsActive = (dests: Destination[]) =>
    dests.length === selectedCount && dests.every((d) => isDestOn(d));
  const destGroups: Array<"Deck" | "Print" | "Digital"> = ["Deck", "Print", "Digital"];

  // Step 1's output types gate which artifacts are even offered in Step 4.
  const destChannel = (id: Destination): ChannelId =>
    id === "presentation" || id === "event" || id === "social" ? id : "print";
  const visibleDests = destinations.filter((d) => isChannelOn(destChannel(d.id)));

  // Exact structure each selected artifact will be generated with — derived
  // from the same recipes/seeds the generators use, so this is a true preview.
  const structurePreviews = useMemo(
    () =>
      buildStructurePreviews({
        seed: {
          prospect: prospectDetails.prospect.trim() || "New prospect",
          industry:
            prospectDetails.industry.trim() || brand?.contentScope?.industries?.[0] || "Life sciences",
          audience: prospectDetails.audience.trim() || "Decision makers",
          meetingObjective:
            prospectDetails.meetingObjective.trim() ||
            prompt.trim() ||
            "Introduce TransPerfect capabilities",
          brandModeId,
          archetypeId:
            narrativeArchetypes.find((a) => a.id === "arch-problem-solution")?.id ??
            narrativeArchetypes[0]?.id ??
            "arch-problem-solution",
          lengthTarget: 9,
          brandName: brand?.name,
        },
        presentation: masterSet.presentation,
        printKinds: masterSet.print.enabled ? masterSet.print.kinds : [],
        event: masterSet.event,
        social: masterSet.social,
      }),
    [prospectDetails, prompt, brandModeId, brand, narrativeArchetypes, masterSet],
  );


  // Pre-submit validation: missing required fields + incompatible combos.
  const validation = useMemo(
    () =>
      validateBrief({
        activeChannels,
        masterSet,
        selectedDestinations: selected.map((d) => d.id),
        prospect: {
          prospect: prospectDetails.prospect,
          industry: prospectDetails.industry,
          audience: prospectDetails.audience,
          relationship: prospectDetails.relationship,
          meetingObjective: prospectDetails.meetingObjective,
        },
        prompt,
        brandModeName: brand?.name,
      }),
    [activeChannels, masterSet, selected, prospectDetails, prompt, brand],
  );

  // Guided sequence — one section on screen at a time.
  const STEPS: Array<{ n: number; label: string }> = [
    { n: 1, label: "Output type" },
    { n: 2, label: "Brand mode" },
    { n: 3, label: "Prospect" },
    { n: 4, label: "Assets" },
    { n: 5, label: "Generate" },
  ];
  const stepBlocked =
    step === 1 && activeChannels.length === 0
      ? "Pick at least one output type to continue."
      : step === 4 && selectedCount === 0
        ? "Select at least one asset to continue."
        : null;


  return (
    <AppShell>
      {/* Hero band — matches the homepage dark chrome */}
      <section className="full-bleed relative -mt-6 overflow-hidden border-b border-white/10 bg-[#03002C] py-10 text-white sm:-mt-10 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full opacity-40 blur-[120px]"
          style={{ background: brandPrimary }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-0 h-[380px] w-[380px] rounded-full opacity-25 blur-[140px]"
          style={{ background: "#A1FBF9" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.05),rgba(255,255,255,0)_90%)]" />
        <div className="relative mx-auto w-full max-w-5xl px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75 backdrop-blur">
            New master brief
          </span>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl">
            What are we making today?
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/65">
            One line. Pick what you need. Refine on the next screen.
          </p>

          {/* Progress rail */}
          <nav aria-label="Brief progress" className="mt-7">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur sm:inline-flex">
              {STEPS.map((s, i) => {
                const state = s.n === step ? "current" : s.n < step ? "done" : "todo";
                return (
                  <li key={s.n} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => s.n <= step && setStep(s.n)}
                      disabled={s.n > step}
                      aria-current={state === "current" ? "step" : undefined}
                      className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-semibold transition-all duration-300 ${
                        state === "current"
                          ? "bg-white text-[#03002C] shadow-lg shadow-black/20"
                          : state === "done"
                            ? "text-white/80 hover:bg-white/[0.08] hover:text-white"
                            : "cursor-default text-white/35"
                      }`}
                    >
                      <span className="font-mono">{state === "done" ? "✓" : s.n}</span>
                      <span>{s.label}</span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <span
                        aria-hidden
                        className={`hidden h-px w-5 sm:block ${s.n < step ? "bg-white/40" : "bg-white/10"}`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-6 py-12 font-['Geist'] text-[#03002C] sm:py-14 lg:px-8 dark:text-white">


        {/* Step 1 — Output type (channel). Defines which assets exist at all. */}
        {step === 1 && (
        <section className="mt-8">
          <div className={CARD_SHELL}>
            <SectionHead
              kicker="Step 1"
              title="Output type"
              hint={`${activeChannels.length} selected`}
            />
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/60 dark:text-white/60">
              Start here — whether this is a PowerPoint, print collateral, an event kit or a social
              set determines which assets get built, which layouts are available, and how the story
              is written.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CHANNELS.map((c) => {
                const on = isChannelOn(c.id);
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleChannel(c.id)}
                    aria-pressed={on}
                    className={`flex flex-col items-start gap-1.5 rounded-2xl border px-4 py-4 text-left transition ${
                      on
                        ? "border-[#003FC7] bg-[#003FC7]/[0.05] shadow-[0_0_0_1px_rgba(0,63,199,0.35)]"
                        : "border-black/10 bg-white hover:-translate-y-0.5 hover:border-black/25 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/25"
                    }`}
                  >
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={1.75}
                      style={{ color: on ? "#003FC7" : undefined }}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold leading-tight text-[#03002C] dark:text-white">
                      {c.label}
                    </span>
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-[0.3em] ${on ? "text-[#003FC7]" : "text-black/45"}`}
                    >
                      {c.kicker}
                    </span>
                    <span className="text-[12px] leading-snug text-black/55">{c.desc}</span>
                  </button>
                );
              })}
            </div>
            {activeChannels.length === 0 && (
              <div className="mt-4 rounded-xl border border-black/10 bg-[#F2F2F2]/60 px-4 py-3 text-[12px] text-black/65 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/65">
                Pick at least one output type — nothing can be generated until you do.
              </div>
            )}
          </div>
        </section>
        )}

        {/* Step 2 — Brand mode */}
        {step === 2 && (
        <section className="mt-8">
          <div className={CARD_SHELL}>
            <SectionHead
              kicker="Step 2"
              title="Brand mode"
              aside={
                <div className="text-xs text-black/45 dark:text-white/45">
                  Everything below is generated in{" "}
                  <strong className="font-semibold text-[#03002C] dark:text-white">
                    {brand?.name ?? "this brand"}
                  </strong>
                  .
                </div>
              }
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {brandModes.map((b) => {
                const active = b.id === brandModeId;
                const c = b.tokens?.primary || "#003FC7";
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBrandModeId(b.id)}
                    aria-pressed={active}
                    className={`rounded-xl border px-3 py-2 text-left text-[11px] font-semibold tracking-tight transition ${
                      active
                        ? "border-[#03002C] bg-[#03002C] text-white"
                        : "border-black/10 bg-white text-black/65 hover:border-black/30 hover:text-black dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:border-white/30 dark:hover:text-white"
                    }`}
                    style={active ? { boxShadow: `inset 0 -2px 0 0 ${c}` } : undefined}
                    title={b.name}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        )}

        {/* Step 3 — Prospect */}
        {step === 3 && (
        <section className="mt-8">
          <ProspectPanel
            value={prospectDetails}
            onChange={setProspectDetails}
            industryOptions={brand?.contentScope?.industries ?? []}
            signedIn={!!signedIn}
          />
        </section>
        )}

        {/* Step 4 — Destinations, scoped to the output types chosen in Step 1 */}
        {step === 4 && (
        <section className="mt-8">
          <div className={CARD_SHELL}>
            <SectionHead
              kicker="Step 4"
              title="Which assets"
              hint={`${selectedCount} selected`}
            />
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/60 dark:text-white/60">
              {activeChannels.length === 0
                ? "Choose an output type in Step 1 to see the assets available for it."
                : "Fine-tune the exact artifacts within your chosen output types. Each one is drafted from the same story and brand mode, so a deck and its leave-behind stay in sync."}
            </p>


            {/* Quick bundles */}
            <div className="mt-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-black/40 dark:text-white/40">
                Common bundles
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEST_PRESETS.map((p) => {
                  const active = presetIsActive(p.dests);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setMasterSet(setFromDestinations(p.dests))}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                        active
                          ? "border-[#03002C] bg-[#03002C] text-white"
                          : "border-black/10 bg-white text-black/65 hover:border-black/30 hover:text-black dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:border-white/30 dark:hover:text-white"
                      }`}
                      title={p.hint}
                    >
                      {p.label}
                      <span
                        className={`ml-2 font-normal ${active ? "text-white/60" : "text-black/40"}`}
                      >
                        {p.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Destination cards, limited to the chosen output types */}
            <div className="mt-5 space-y-4">
              {destGroups
                .filter((g) => visibleDests.some((d) => d.group === g))
                .map((g) => (
                <div key={g}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-black/40 dark:text-white/40">
                    {g}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {visibleDests
                      .filter((d) => d.group === g)
                      .map((t) => {
                        const on = isDestOn(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleDest(t.id)}
                            aria-pressed={on}
                            className={`relative flex flex-col items-start gap-1 rounded-2xl border px-4 py-3.5 pr-10 text-left transition ${
                              on
                                ? "border-[#003FC7] bg-[#003FC7]/[0.04] shadow-[0_0_0_1px_rgba(0,63,199,0.35)]"
                                : "border-black/10 bg-white hover:-translate-y-0.5 hover:border-black/25 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/25"
                            }`}
                          >
                            <span className="flex items-baseline gap-2">
                              <span className="text-sm font-semibold leading-tight text-[#03002C] dark:text-white">
                                {t.label}
                              </span>
                              <span
                                className={`text-[9px] font-semibold uppercase tracking-[0.3em] ${on ? "text-[#003FC7]" : "text-black/45"}`}
                              >
                                {t.output}
                              </span>
                            </span>
                            <span className="text-[12px] leading-snug text-black/55">{t.desc}</span>
                            <span
                              aria-hidden
                              className={`absolute right-3.5 top-4 h-2 w-2 rounded-full transition ${on ? "bg-[#003FC7]" : "bg-black/15"}`}
                            />
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            {/* Running summary */}
            <div className="mt-5 rounded-2xl border border-black/10 bg-[#F2F2F2]/60 px-4 py-3 text-[12px] text-black/65 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/65">
              {selectedCount === 0 ? (
                <>Nothing selected yet — pick at least one output before generating.</>
              ) : (
                <>
                  This brief will produce{" "}
                  <strong className="font-semibold text-[#03002C] dark:text-white">
                    {selected.map((d) => d.label).join(", ")}
                  </strong>{" "}
                  in <strong className="font-semibold text-[#03002C] dark:text-white">{brand?.name}</strong> styling.
                </>
              )}
            </div>

            {/* Live structure preview of exactly what gets generated */}
            <StructurePreviewPanel
              previews={structurePreviews}
              accent={brandPrimary}
              validation={validation}
            />
          </div>
        </section>
        )}

        {/* Step 5 — Write the brief and generate */}
        {step === 5 && (
        <section className="mt-8">
          <div className={`mb-4 ${CARD_SHELL}`}>
            <SectionHead kicker="Step 5" title="Brief the AI" />
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/60 dark:text-white/60">
              One or two sentences of context. Everything you picked in steps 1–4 is already locked
              in — this is just the story.
            </p>
            <div className="mt-3 text-[12px] text-black/60 dark:text-white/60">
              Producing{" "}
              <strong className="font-semibold text-[#03002C] dark:text-white">
                {selected.map((d) => d.label).join(", ") || "nothing yet"}
              </strong>{" "}
              in <strong className="font-semibold text-[#03002C] dark:text-white">{brand?.name}</strong> styling.
            </div>
          </div>


          <div className="rounded-2xl border border-black/10 bg-white p-2 transition focus-within:border-[#003FC7]/50 focus-within:shadow-lg dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (!busy) void generateWithAi();
                  }
                }}
                rows={2}
                placeholder="e.g. Pilot pitch for Acme Global expanding into 12 markets, meeting VP Marketing next Tuesday…"
                className="flex-1 resize-none bg-transparent px-4 py-3 text-[15px] leading-snug text-[#03002C] placeholder:text-black/35 focus:outline-none dark:text-white dark:placeholder:text-white/35"
              />
              <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-stretch sm:justify-between sm:px-1 sm:pb-1">
                <button
                  type="button"
                  onClick={() => void generateWithAi()}
                  disabled={busy || selectedCount === 0 || !validation.canSubmit}
                  title={
                    validation.canSubmit
                      ? undefined
                      : `Resolve ${validation.errors.length} issue(s) in the structure preview first`
                  }
                  className={BTN_PRIMARY}
                >
                  {busy
                    ? aiStatus === "assembling"
                      ? "Assembling…"
                      : aiStatus === "knowledge"
                        ? "Pulling context…"
                        : "Personalizing…"
                    : "Generate"}
                  <span className="hidden font-mono text-[10px] font-normal opacity-70 sm:inline">
                    ⌘↵
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void generateFast()}
                  disabled={busy || selectedCount === 0 || !validation.canSubmit}
                  className="text-[11px] font-medium uppercase tracking-widest text-black/50 transition hover:text-black disabled:opacity-40"
                >
                  {expanding ? "Producing…" : "or skip AI →"}
                </button>
              </div>
            </div>
          </div>

          {aiStatus === "error" && aiError && (
            <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              AI failed: {aiError}
            </div>
          )}

          <GenerationProgress jobs={jobs} />
        </section>
        )}

        {/* Side path, offered only on the first step so it never competes
            with the main sequence further in. */}
        {step === 1 && (
        <section className="mt-14">
          <div className="rounded-2xl border border-dashed border-[#003FC7]/30 bg-[#003FC7]/[0.03] p-6 dark:border-[#A1FBF9]/25 dark:bg-white/[0.03]">
            <SectionHead kicker="Shortcut" title="Need one specific asset?" />
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/60 dark:text-white/60">
              Describe it. We’ll auto-generate a {brand?.name ?? "division"}-styled starting point —
              then you (or the Copilot) fine-tune it in the editor.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={assetRequest}
                onChange={(e) => setAssetRequest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void generateRequestedAsset();
                  }
                }}
                placeholder="e.g. a one-pager for a pharma RFP response"
                aria-label="Describe the specific asset you need"
                className="flex-1 rounded-full border border-black/10 bg-white px-4 py-3 text-sm text-[#03002C] placeholder:text-black/35 focus:border-[#003FC7]/60 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/35"
              />
              <button
                type="button"
                onClick={() => void generateRequestedAsset()}
                disabled={busy || !assetRequest.trim()}
                className={BTN_PRIMARY}
              >
                {busy ? "Generating…" : "Auto-generate"}
              </button>
            </div>

            <ReferenceAssetUploader
              assets={referenceAssets}
              onChange={setReferenceAssetsAndClearSummary}
              disabled={busy}
            />

            {referenceAssets.length > 0 && (
              <div className="mt-3 rounded-lg border border-black/10 bg-white p-3">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/45">
                  Will use during generation
                </div>
                <ul className="mt-2 space-y-1">
                  {referenceAssets.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-xs text-black/70">
                      <FileText className="h-3.5 w-3.5 text-icon-muted" aria-hidden />
                      <span className="truncate">{a.name}</span>
                      {a.pages && (
                        <span className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] text-black/50">
                          {a.pages} page{a.pages > 1 ? "s" : ""}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {referenceSummary && (
              <div
                className={`mt-3 rounded-lg border p-3 ${
                  referenceSummary.accepted.length > 0
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50"
                }`}
                role="status"
                aria-live="polite"
              >
                {referenceSummary.accepted.length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-emerald-800">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <div>
                      <div className="font-medium">Analysed and applied</div>
                      <div className="mt-0.5 text-emerald-700/80">
                        {referenceSummary.accepted.join(", ")}
                      </div>
                    </div>
                  </div>
                )}
                {referenceSummary.rejected.length > 0 && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-rose-800">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <div>
                      <div className="font-medium">Not used</div>
                      <div className="mt-0.5 text-rose-700/80">
                        {referenceSummary.rejected.join(", ")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}



            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {assetRequest.trim() ? (
                <>
                  <span className="text-[11px] text-black/45">Will produce:</span>
                  {matchedDests.map((d) => (
                    <span
                      key={d}
                      className="rounded-full border border-[#003FC7]/30 bg-white px-2.5 py-1 text-[11px] font-medium text-[#003FC7]"
                    >
                      {destLabel(d)}
                    </span>
                  ))}
                </>
              ) : (
                <>
                  <span className="text-[11px] text-black/45">Try:</span>
                  {[
                    "case study for a life sciences win",
                    "one-pager leave-behind",
                    "LinkedIn campaign post",
                    "booth signage for the event",
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAssetRequest(s)}
                      className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-black/60 transition hover:border-[#003FC7]/40 hover:text-[#003FC7]"
                    >
                      {s}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Versions of this request */}
            {assetVersions.length > 0 ? (
              <div className="mt-4 rounded-xl border border-black/10 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-black/45 dark:text-white/45">
                    Versions of this request · {assetVersions.length}
                  </div>
                  <button
                    type="button"
                    onClick={() => void generateRequestedAsset()}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#003FC7]/30 px-3 py-1.5 text-[11px] font-semibold text-[#003FC7] transition hover:bg-[#003FC7]/10 disabled:opacity-40"
                  >
                    {busy ? "Regenerating…" : `Regenerate this asset → v${assetVersions.length + 1}`}
                  </button>
                </div>

                {inheritedReferences && (
                  <div className="mt-2 rounded-lg border border-black/10 bg-black/[0.02] p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-black/60">
                        {referenceMode === "reuse" ? (
                          <>
                            <span className="font-semibold text-[#03002C] dark:text-white">
                              Reusing the same reference assets
                            </span>{" "}
                            · {inheritedReferences.fileNames.join(", ")}
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-[#03002C] dark:text-white">
                              Using newly attached references
                            </span>{" "}
                            · attach files above for different guidance
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setReferenceMode((m) => (m === "reuse" ? "swap" : "reuse"))
                        }
                        className="rounded-lg border border-black/15 px-2.5 py-1 text-[11px] font-semibold text-black/65 transition hover:border-black/35 hover:text-black disabled:opacity-40"
                      >
                        {referenceMode === "reuse" ? "Swap references" : "Reuse previous"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {assetVersions.map((v) => (
                    <Link
                      key={v.id}
                      to="/decks/$deckId"
                      params={{ deckId: v.deckId }}
                      title={`${v.matched.join(", ") || "Asset"} · ${new Date(v.createdAt).toLocaleString()}`}
                      className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-medium text-[#03002C] transition hover:border-[#003FC7]/50 hover:text-[#003FC7]"
                    >
                      v{v.version}
                      <span className="ml-1.5 text-black/40">
                        {new Date(v.createdAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : lastRequest && !assetRequest.trim() ? (
              <button
                type="button"
                onClick={() => setAssetRequest(lastRequest)}
                className="mt-4 text-[11px] text-black/50 underline decoration-dotted underline-offset-4 transition hover:text-[#003FC7]"
              >
                Reload your last request: “{lastRequest}”
              </button>
            ) : null}
          </div>
        </section>
        )}

        {/* Wizard navigation — one decision at a time */}
        <div className="mt-10 border-t border-black/10 pt-5 dark:border-white/10">
          {stepBlocked && (
            <p className="mb-3 text-[12px] text-black/55" role="status">
              {stepBlocked}
            </p>
          )}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className={`${BTN_SECONDARY} disabled:opacity-30`}
            >
              ← Back
            </button>
            <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-black/40 dark:text-white/40">
              Step {step} of {STEPS.length}
            </div>
            {step < STEPS.length ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
                disabled={!!stepBlocked}
                className={BTN_PRIMARY}
              >
                Continue →
              </button>
            ) : (
              <span className="w-[104px]" aria-hidden />
            )}
          </div>
        </div>


        <div className="mt-16 flex items-center justify-between border-t border-black/10 pt-5 text-[11px] text-black/50 dark:border-white/10 dark:text-white/50">
          <span>
            Assembling under{" "}
            <strong className="font-semibold text-[#03002C] dark:text-white">{brand?.name ?? "brand"}</strong>.
            Refine everything else on the deck page.
          </span>
          <span
            className="inline-block h-2 w-10 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${brandPrimary}, ${brandAccent})`,
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}

/* ---------- homepage-matched chrome ----------
   These mirror the card / button / section-head styles used on the
   homepage (src/routes/index.tsx) so the brief flow reads as the same
   product surface. */

const CARD_SHELL =
  "rounded-2xl border border-black/10 bg-white p-6 transition dark:border-white/10 dark:bg-white/[0.04]";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";

const BTN_PRIMARY = `${BTN_BASE} bg-[#03002C] text-white shadow-lg shadow-black/20 hover:-translate-y-0.5 hover:shadow-xl disabled:hover:translate-y-0 disabled:hover:shadow-lg dark:bg-white dark:text-[#03002C]`;

const BTN_SECONDARY = `${BTN_BASE} border border-black/15 bg-white text-black/70 hover:border-black/35 hover:text-black dark:border-white/20 dark:bg-white/[0.05] dark:text-white/85 dark:hover:border-white/40 dark:hover:bg-white/[0.1]`;

function SectionHead({
  kicker,
  title,
  hint,
  aside,
}: {
  kicker: string;
  title: string;
  hint?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#003FC7] dark:text-[#A1FBF9]">
          {kicker}
        </div>
        <div className="mt-1 flex items-baseline gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {hint && <span className="text-xs text-black/45 dark:text-white/45">{hint}</span>}
        </div>
      </div>
      {aside}
    </div>
  );
}
