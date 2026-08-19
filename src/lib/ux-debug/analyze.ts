/**
 * Turns a recorded session into a prioritized usability checklist.
 *
 * Every rule is a heuristic mapped to a known interaction-design failure mode,
 * so the output reads like a review ("users clicked X three times with no
 * response") rather than a raw event log.
 */

import { SEVERITY_WEIGHT, type UxIssue, type UxReport, type UxSession, type UxStep } from "./types";

function groupBy(steps: UxStep[], key: (s: UxStep) => string): Map<string, UxStep[]> {
  const map = new Map<string, UxStep[]>();
  for (const s of steps) {
    const k = key(s);
    const list = map.get(k);
    if (list) list.push(s);
    else map.set(k, [s]);
  }
  return map;
}

function quote(s: UxStep): string {
  const when = new Date(s.t).toLocaleTimeString();
  return `${when} · ${s.route} · ${s.label}${s.detail ? ` — ${s.detail}` : ""}`;
}

function issue(
  partial: Omit<UxIssue, "priority" | "id"> & { id?: string },
): UxIssue {
  const priority =
    SEVERITY_WEIGHT[partial.severity] + Math.min(40, (partial.occurrences - 1) * 8);
  return {
    id: partial.id ?? `${partial.category}-${partial.area}-${partial.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    ...partial,
    priority,
  };
}

export function analyzeSession(session: UxSession): UxReport {
  const steps = session.steps;
  const issues: UxIssue[] = [];

  // 1) Runtime errors — always the first thing to fix.
  const errors = steps.filter((s) => s.kind === "error");
  for (const [msg, list] of groupBy(errors, (s) => s.label)) {
    issues.push(
      issue({
        title: `Runtime error interrupts the flow: “${msg}”`,
        category: "Reliability",
        severity: "critical",
        area: list[0]!.route,
        occurrences: list.length,
        evidence: list.slice(0, 3).map(quote),
        recommendation:
          "Reproduce on this route, guard the failing call, and surface a recoverable message instead of a blank/frozen surface.",
        stepIds: list.map((s) => s.id),
      }),
    );
  }

  // 2) Failed requests.
  const netErrors = steps.filter((s) => s.kind === "net-error");
  for (const [target, list] of groupBy(netErrors, (s) => s.target ?? s.label)) {
    issues.push(
      issue({
        title: `Request keeps failing: ${target.replace(/^net:/, "")}`,
        category: "Reliability",
        severity: list.length > 1 ? "critical" : "high",
        area: list[0]!.route,
        occurrences: list.length,
        evidence: list.slice(0, 3).map(quote),
        recommendation:
          "Add an inline error state with a retry affordance so the user is not left guessing whether the action landed.",
        stepIds: list.map((s) => s.id),
      }),
    );
  }

  // 3) Rage clicks — the strongest signal of a broken or unresponsive control.
  const rage = steps.filter((s) => s.kind === "rage-click");
  for (const [target, list] of groupBy(rage, (s) => s.target ?? s.label)) {
    issues.push(
      issue({
        title: `Repeated frustrated clicking on “${list[0]!.label}”`,
        category: "Feedback",
        severity: "high",
        area: `${list[0]!.route} · ${target}`,
        occurrences: list.length,
        evidence: list.slice(0, 3).map(quote),
        recommendation:
          "Give the control immediate optimistic feedback (pressed/loading state) and confirm completion with a toast or state change.",
        stepIds: list.map((s) => s.id),
      }),
    );
  }

  // 4) Dead clicks — users expect something to be interactive but it isn't.
  const dead = steps.filter((s) => s.kind === "dead-click");
  for (const [target, list] of groupBy(dead, (s) => s.target ?? s.label)) {
    if (list.length < 2) continue;
    issues.push(
      issue({
        title: `“${list[0]!.label}” looks clickable but does nothing`,
        category: "Affordance",
        severity: list.length > 3 ? "high" : "medium",
        area: `${list[0]!.route} · ${target}`,
        occurrences: list.length,
        evidence: list.slice(0, 3).map(quote),
        recommendation:
          "Either make the element actionable (open the item, focus the field) or remove the visual affordance — border, shadow, hover cue.",
        stepIds: list.map((s) => s.id),
      }),
    );
  }

  // 5) Backtracking — navigation/findability problem.
  const backtracks = steps.filter((s) => s.kind === "backtrack");
  for (const [route, list] of groupBy(backtracks, (s) => s.route)) {
    issues.push(
      issue({
        title: `Users bounce back to ${route} looking for the next step`,
        category: "Findability",
        severity: list.length > 2 ? "high" : "medium",
        area: route,
        occurrences: list.length,
        evidence: list.slice(0, 3).map(quote),
        recommendation:
          "Clarify the primary action on the destination page, or add a persistent breadcrumb/return path so exploring isn't a dead end.",
        stepIds: list.map((s) => s.id),
      }),
    );
  }

  // 6) Hesitation — unclear next step.
  const stalls = steps.filter((s) => s.kind === "hesitation");
  for (const [route, list] of groupBy(stalls, (s) => s.route)) {
    issues.push(
      issue({
        title: `Long pause with no action on ${route}`,
        category: "Findability",
        severity: list.length > 2 ? "medium" : "low",
        area: route,
        occurrences: list.length,
        evidence: list.slice(0, 3).map(quote),
        recommendation:
          "Reduce the number of equally-weighted choices, promote one obvious next action, and add short helper copy where the pause happens.",
        stepIds: list.map((s) => s.id),
      }),
    );
  }

  // 7) Toggle thrash — the control's effect isn't legible.
  const toggles = steps.filter((s) => s.kind === "toggle" || s.kind === "state");
  for (const [target, list] of groupBy(toggles, (s) => s.target ?? s.label)) {
    if (list.length < 4) continue;
    const span = list[list.length - 1]!.t - list[0]!.t;
    if (span > 90000) continue;
    issues.push(
      issue({
        title: `“${list[0]!.label}” flipped ${list.length}× while comparing results`,
        category: "Feedback",
        severity: "medium",
        area: `${list[0]!.route} · ${target}`,
        occurrences: list.length,
        evidence: list.slice(0, 3).map(quote),
        recommendation:
          "Show the before/after side by side (or label the current value inline) so the user doesn't have to toggle repeatedly to understand it.",
        stepIds: list.map((s) => s.id),
      }),
    );
  }

  // 8) Escape churn — users trying to get out of a mode/dialog.
  const escapes = steps.filter((s) => s.kind === "key" && s.label.includes("Escape"));
  if (escapes.length >= 3) {
    issues.push(
      issue({
        title: `Escape pressed ${escapes.length}× to leave a mode or overlay`,
        category: "Efficiency",
        severity: escapes.length > 5 ? "high" : "medium",
        area: escapes[0]!.route,
        occurrences: escapes.length,
        evidence: escapes.slice(0, 3).map(quote),
        recommendation:
          "Make the exit path visible (a labelled Done/Close button) and ensure one Escape returns to a predictable state.",
        stepIds: escapes.map((s) => s.id),
      }),
    );
  }

  // 9) Form re-entry — the same field edited over and over.
  const inputs = steps.filter((s) => s.kind === "input");
  for (const [target, list] of groupBy(inputs, (s) => s.target ?? s.label)) {
    if (list.length < 4) continue;
    issues.push(
      issue({
        title: `“${list[0]!.label}” rewritten ${list.length}× before moving on`,
        category: "Affordance",
        severity: "low",
        area: `${list[0]!.route} · ${target}`,
        occurrences: list.length,
        evidence: list.slice(0, 2).map(quote),
        recommendation:
          "Add format hints, an example value, and inline validation so the expected input is obvious on the first attempt.",
        stepIds: list.map((s) => s.id),
      }),
    );
  }

  // 10) Slow requests without progress.
  const slow = steps.filter((s) => s.kind === "net-slow");
  for (const [target, list] of groupBy(slow, (s) => s.target ?? s.label)) {
    issues.push(
      issue({
        title: `Slow operation on ${target.replace(/^net:/, "")}`,
        category: "Performance",
        severity: list.length > 2 ? "high" : "medium",
        area: list[0]!.route,
        occurrences: list.length,
        evidence: list.slice(0, 3).map(quote),
        recommendation:
          "Stream or paginate the work, and always render determinate progress — a skeleton plus a step label beats a spinner.",
        stepIds: list.map((s) => s.id),
      }),
    );
  }

  // 11) Long click chains to complete work on a single route.
  const clicksByRoute = groupBy(
    steps.filter((s) => s.kind === "click" || s.kind === "toggle"),
    (s) => s.route,
  );
  for (const [route, list] of clicksByRoute) {
    if (list.length < 25) continue;
    issues.push(
      issue({
        title: `${list.length} interactions needed on ${route}`,
        category: "Efficiency",
        severity: list.length > 45 ? "medium" : "low",
        area: route,
        occurrences: list.length,
        evidence: [`${list.length} clicks/toggles between ${new Date(list[0]!.t).toLocaleTimeString()} and ${new Date(list[list.length - 1]!.t).toLocaleTimeString()}`],
        recommendation:
          "Batch the repeated step (multi-select, presets, or a keyboard shortcut) to collapse the interaction count.",
        stepIds: list.slice(0, 12).map((s) => s.id),
      }),
    );
  }

  // 12) Unsaved-work risk: destructive navigation right after edits.
  const riskySteps: UxStep[] = [];
  for (let i = 1; i < steps.length; i += 1) {
    const prev = steps[i - 1]!;
    const cur = steps[i]!;
    const edited = prev.kind === "input" || prev.kind === "state" || prev.kind === "toggle";
    if (edited && cur.kind === "nav" && (cur.gapMs ?? 0) < 2500) riskySteps.push(cur);
  }
  if (riskySteps.length >= 2) {
    issues.push(
      issue({
        title: `Navigated away ${riskySteps.length}× immediately after editing`,
        category: "Data safety",
        severity: "medium",
        area: riskySteps[0]!.route,
        occurrences: riskySteps.length,
        evidence: riskySteps.slice(0, 3).map(quote),
        recommendation:
          "Autosave on change or warn before leaving with pending edits, and show a persistent 'saved' indicator.",
        stepIds: riskySteps.map((s) => s.id),
      }),
    );
  }

  issues.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));

  const routesVisited = [...new Set(steps.map((s) => s.route).filter(Boolean))];
  const penalty = issues.reduce((sum, i) => sum + i.priority, 0);
  const healthScore = Math.max(0, Math.round(100 - Math.min(100, penalty / 4)));

  return {
    sessionId: session.id,
    label: session.label,
    durationMs: (session.endedAt ?? Date.now()) - session.startedAt,
    stepCount: steps.length,
    routesVisited,
    issues,
    healthScore,
  };
}

/** Markdown checklist, ready to paste into a ticket. */
export function reportToMarkdown(report: UxReport): string {
  const lines: string[] = [
    `# UX debugging report — ${report.label}`,
    "",
    `- Duration: ${Math.round(report.durationMs / 1000)}s`,
    `- Steps recorded: ${report.stepCount}`,
    `- Routes: ${report.routesVisited.join(", ") || "—"}`,
    `- Health score: ${report.healthScore}/100`,
    "",
    "## Prioritized checklist",
    "",
  ];
  if (!report.issues.length) {
    lines.push("- [x] No usability issues detected in this session.");
  }
  report.issues.forEach((i, idx) => {
    lines.push(
      `- [ ] **${idx + 1}. ${i.title}** — \`${i.severity}\` · ${i.category} · ${i.area} (${i.occurrences}×)`,
      `      - Fix: ${i.recommendation}`,
      ...i.evidence.map((e) => `      - Evidence: ${e}`),
    );
  });
  return lines.join("\n");
}
