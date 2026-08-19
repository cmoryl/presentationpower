/**
 * Debugging Workflow mode — shared types.
 *
 * A session is an ordered list of low-level steps captured while a real user
 * (or a tester) works through the app. `analyzeSession` turns those steps into
 * a prioritized usability checklist.
 */

export type UxStepKind =
  | "session-start"
  | "nav"
  | "click"
  | "dead-click"
  | "rage-click"
  | "toggle"
  | "input"
  | "key"
  | "state"
  | "hesitation"
  | "backtrack"
  | "error"
  | "net-error"
  | "net-slow"
  | "note";

export type UxStep = {
  id: string;
  /** epoch ms */
  t: number;
  kind: UxStepKind;
  /** Human-readable label of the control / event. */
  label: string;
  /** Route pathname the step happened on. */
  route: string;
  /** Optional extra context (value, selector, status code, message…). */
  detail?: string;
  /** Rough element target signature, used to group repeats. */
  target?: string;
  /** ms since previous step. */
  gapMs?: number;
};

export type UxSession = {
  id: string;
  label: string;
  startedAt: number;
  endedAt?: number;
  userAgent: string;
  viewport: { w: number; h: number };
  steps: UxStep[];
};

export type UxSeverity = "critical" | "high" | "medium" | "low";

export type UxIssue = {
  id: string;
  title: string;
  category:
    | "Reliability"
    | "Affordance"
    | "Findability"
    | "Feedback"
    | "Efficiency"
    | "Performance"
    | "Data safety";
  severity: UxSeverity;
  /** Where it happened (route or control). */
  area: string;
  occurrences: number;
  /** Short quotes from the timeline that justify the issue. */
  evidence: string[];
  recommendation: string;
  /** Higher = fix sooner. */
  priority: number;
  /** Step ids that produced the issue. */
  stepIds: string[];
};

export type UxReport = {
  sessionId: string;
  label: string;
  durationMs: number;
  stepCount: number;
  routesVisited: string[];
  issues: UxIssue[];
  /** 0–100, 100 = clean run. */
  healthScore: number;
};

export const SEVERITY_WEIGHT: Record<UxSeverity, number> = {
  critical: 100,
  high: 55,
  medium: 25,
  low: 10,
};
