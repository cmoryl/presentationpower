// Pre-submit validation for the master brief.
// Surfaces missing required fields and incompatible combinations in the live
// structure preview *before* generation starts.

export type BriefIssueLevel = "error" | "warning";

export type BriefIssue = {
  id: string;
  level: BriefIssueLevel;
  /** Which step the user needs to go fix. */
  step: string;
  title: string;
  detail: string;
};

export type BriefValidationInput = {
  activeChannels: string[]; // "presentation" | "print" | "event" | "social"
  masterSet: {
    presentation: boolean;
    print: { enabled: boolean; kinds: string[] };
    event: { enabled: boolean; playbookId: string | null };
    social: { enabled: boolean; playbookId: string | null };
  };
  selectedDestinations: string[];
  prospect: {
    prospect: string;
    industry: string;
    audience: string;
    relationship: string;
    meetingObjective: string;
  };
  prompt: string;
  brandModeName?: string;
};

export type BriefValidation = {
  issues: BriefIssue[];
  errors: BriefIssue[];
  warnings: BriefIssue[];
  /** No blocking errors — safe to generate. */
  canSubmit: boolean;
};

export function validateBrief(input: BriefValidationInput): BriefValidation {
  const { activeChannels, masterSet, selectedDestinations, prospect, prompt } = input;
  const issues: BriefIssue[] = [];
  const has = (d: string) => selectedDestinations.includes(d);
  const printSelected = selectedDestinations.some((d) => d.startsWith("print:"));

  // ---- Step 1: output type ------------------------------------------------
  if (activeChannels.length === 0) {
    issues.push({
      id: "no-channel",
      level: "error",
      step: "Step 1",
      title: "No output type selected",
      detail: "Pick at least one of Presentation, Print, Event or Social — this defines every asset that gets built.",
    });
  }

  // ---- Step 4: artifacts --------------------------------------------------
  if (selectedDestinations.length === 0) {
    issues.push({
      id: "no-artifacts",
      level: "error",
      step: "Step 4",
      title: "No artifacts selected",
      detail: "Choose at least one artifact to generate, or use a preset bundle.",
    });
  }

  // Channel turned on in Step 1 but nothing chosen for it in Step 4.
  const orphan: Array<[string, boolean, string]> = [
    ["presentation", has("presentation"), "Presentation"],
    ["print", printSelected, "Print"],
    ["event", has("event"), "Event"],
    ["social", has("social"), "Social"],
  ];
  for (const [channel, covered, label] of orphan) {
    if (activeChannels.includes(channel) && !covered) {
      issues.push({
        id: `orphan-${channel}`,
        level: "error",
        step: "Step 4",
        title: `${label} selected but no ${label.toLowerCase()} artifact chosen`,
        detail: `You picked ${label} as an output type in Step 1. Select a ${label.toLowerCase()} artifact in Step 4 or turn the output type off.`,
      });
    }
  }

  if (masterSet.print.enabled && masterSet.print.kinds.length === 0) {
    issues.push({
      id: "print-no-kind",
      level: "error",
      step: "Step 4",
      title: "Print enabled with no format",
      detail: "Pick at least one print format (case study, spotlight, eBrochure or adaptor brief).",
    });
  }
  if (has("event") && !masterSet.event.playbookId) {
    issues.push({
      id: "event-no-playbook",
      level: "error",
      step: "Step 4",
      title: "Event kit has no playbook",
      detail: "Choose an event playbook so the kit knows which architecture to build.",
    });
  }
  if (has("social") && !masterSet.social.playbookId) {
    issues.push({
      id: "social-no-playbook",
      level: "error",
      step: "Step 4",
      title: "Social set has no playbook",
      detail: "Choose a social playbook so the post cadence and formats are defined.",
    });
  }

  // ---- Step 3: prospect ---------------------------------------------------
  if (!prospect.prospect.trim()) {
    issues.push({
      id: "no-prospect",
      level: "warning",
      step: "Step 3",
      title: "No prospect or account name",
      detail: 'Without a name every artifact is written for a generic "New prospect" and titles stay placeholder.',
    });
  }
  if (!prospect.industry.trim()) {
    issues.push({
      id: "no-industry",
      level: "warning",
      step: "Step 3",
      title: "No industry set",
      detail: "Industry drives proof points, terminology and which existing assets can be reused.",
    });
  }
  if (!prospect.meetingObjective.trim() && !prompt.trim()) {
    issues.push({
      id: "no-objective",
      level: "warning",
      step: "Step 3",
      title: "No objective or brief line",
      detail: "Add a meeting objective or a one-line brief so the narrative has a point of view to argue.",
    });
  }
  if (!prospect.audience.trim()) {
    issues.push({
      id: "no-audience",
      level: "warning",
      step: "Step 3",
      title: "No audience set",
      detail: "Audience sets the register — executive, procurement or practitioner copy differ substantially.",
    });
  }

  // ---- Incompatible / risky combinations ----------------------------------
  if (has("print:adaptor-brief") && prospect.relationship === "new") {
    issues.push({
      id: "adaptor-new-relationship",
      level: "warning",
      step: "Step 3 / 4",
      title: "Adaptor brief on a net-new relationship",
      detail: "Adaptor briefs assume an existing account with known systems. For a cold prospect a spotlight or case study lands better.",
    });
  }
  if (has("event") && !has("presentation")) {
    issues.push({
      id: "event-without-deck",
      level: "warning",
      step: "Step 4",
      title: "Event kit without a deck",
      detail: "Event kits reference the main narrative deck for stage content. Add the presentation for a complete kit.",
    });
  }
  if (has("social") && selectedDestinations.length === 1) {
    issues.push({
      id: "social-only",
      level: "warning",
      step: "Step 4",
      title: "Social set with no source asset",
      detail: "Social posts are derived from deck or print messaging. Add at least one to give the copy something to pull from.",
    });
  }
  if (selectedDestinations.length > 6) {
    issues.push({
      id: "too-many",
      level: "warning",
      step: "Step 4",
      title: `${selectedDestinations.length} artifacts in one brief`,
      detail: "Large batches take noticeably longer and are harder to review. Consider splitting into two briefs.",
    });
  }

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  return { issues, errors, warnings, canSubmit: errors.length === 0 };
}
