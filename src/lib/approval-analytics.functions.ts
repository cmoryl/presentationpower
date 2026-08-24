// Approvals analytics: how long items sit in each review state, and which
// asset types are slowing the queue down.
//
// The approval workflow keeps one row per item (`approval_requests`) with
// created_at (submitted), updated_at (last state change) and decided_at
// (approved / changes requested). From those we derive:
//   • waiting      — pending items: now - created_at
//   • in review    — decided items: decided_at - created_at (time to decision)
//   • rework       — changes_requested items: now - updated_at
// Bottlenecks are ranked per asset type by how much its waiting time exceeds
// the workspace median, weighted by how many items are stuck.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { APPROVAL_SUBJECT_TYPES } from "./brand-approvals.functions";

export type ApprovalStateStat = {
  state: "waiting" | "in_review" | "rework";
  label: string;
  items: number;
  avgHours: number;
  medianHours: number;
  p90Hours: number;
  oldestHours: number;
};

export type ApprovalTypeStat = {
  subjectType: string;
  total: number;
  open: number;
  approved: number;
  changesRequested: number;
  avgWaitHours: number;
  avgDecisionHours: number;
  reworkRate: number;
  firstPassRate: number;
  bottleneckScore: number;
  bottleneckReason: string;
};

export type ApprovalAnalytics = {
  windowDays: number;
  totals: {
    submitted: number;
    open: number;
    decided: number;
    approved: number;
    changesRequested: number;
    throughputPerWeek: number;
  };
  states: ApprovalStateStat[];
  types: ApprovalTypeStat[];
  bottlenecks: ApprovalTypeStat[];
  isReviewer: boolean;
};

const HOUR = 3_600_000;

function hoursBetween(a: string, b: number): number {
  return Math.max(0, (b - new Date(a).getTime()) / HOUR);
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function summarize(
  state: ApprovalStateStat["state"],
  label: string,
  values: number[],
): ApprovalStateStat {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    state,
    label,
    items: sorted.length,
    avgHours: sorted.length ? round(sum / sorted.length) : 0,
    medianHours: round(quantile(sorted, 0.5)),
    p90Hours: round(quantile(sorted, 0.9)),
    oldestHours: round(sorted.length ? sorted[sorted.length - 1]! : 0),
  };
}

type Row = {
  subject_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
};

export const getApprovalAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ windowDays: z.number().int().min(7).max(365).optional() }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }): Promise<ApprovalAnalytics> => {
    const { supabase, userId } = context;
    const windowDays = data.windowDays ?? 90;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (roleRows ?? []).map((r) => String((r as { role: string }).role));
    const isReviewer = roles.includes("admin") || roles.includes("brand_reviewer");

    const since = new Date(Date.now() - windowDays * 24 * HOUR).toISOString();
    // RLS scopes this: reviewers see the whole queue, submitters only their own.
    const { data: rows, error } = await supabase
      .from("approval_requests")
      .select("subject_type, status, created_at, updated_at, decided_at")
      .gte("created_at", since)
      .limit(5000)
      .returns<Row[]>();
    if (error) throw new Error(error.message);

    const all = rows ?? [];
    const now = Date.now();

    const waiting: number[] = [];
    const inReview: number[] = [];
    const rework: number[] = [];

    for (const r of all) {
      if (r.status === "pending") waiting.push(hoursBetween(r.created_at, now));
      else if (r.status === "changes_requested") {
        rework.push(hoursBetween(r.updated_at, now));
        if (r.decided_at) inReview.push(hoursBetween(r.created_at, new Date(r.decided_at).getTime()));
      } else if (r.status === "approved" && r.decided_at) {
        inReview.push(hoursBetween(r.created_at, new Date(r.decided_at).getTime()));
      }
    }

    const states: ApprovalStateStat[] = [
      summarize("waiting", "Awaiting first review", waiting),
      summarize("in_review", "Submission → decision", inReview),
      summarize("rework", "Sitting in changes requested", rework),
    ];

    const byType = new Map<string, Row[]>();
    for (const t of APPROVAL_SUBJECT_TYPES) byType.set(t, []);
    for (const r of all) {
      const list = byType.get(r.subject_type) ?? [];
      list.push(r);
      byType.set(r.subject_type, list);
    }

    const typeStats: ApprovalTypeStat[] = [];
    for (const [subjectType, list] of byType) {
      if (list.length === 0) continue;
      const pending = list.filter((r) => r.status === "pending");
      const changes = list.filter((r) => r.status === "changes_requested");
      const approved = list.filter((r) => r.status === "approved");
      const openWaits = [
        ...pending.map((r) => hoursBetween(r.created_at, now)),
        ...changes.map((r) => hoursBetween(r.updated_at, now)),
      ];
      const decisions = list
        .filter((r) => r.decided_at)
        .map((r) => hoursBetween(r.created_at, new Date(r.decided_at!).getTime()));
      const decided = approved.length + changes.length;
      typeStats.push({
        subjectType,
        total: list.length,
        open: pending.length + changes.length,
        approved: approved.length,
        changesRequested: changes.length,
        avgWaitHours: openWaits.length
          ? round(openWaits.reduce((a, v) => a + v, 0) / openWaits.length)
          : 0,
        avgDecisionHours: decisions.length
          ? round(decisions.reduce((a, v) => a + v, 0) / decisions.length)
          : 0,
        reworkRate: decided ? Math.round((changes.length / decided) * 100) : 0,
        firstPassRate: decided ? Math.round((approved.length / decided) * 100) : 0,
        bottleneckScore: 0,
        bottleneckReason: "",
      });
    }

    // Bottleneck score: excess wait over the workspace median wait, amplified by
    // the number of open items and the rework rate.
    const medianWait = quantile(
      typeStats.map((t) => t.avgWaitHours).sort((a, b) => a - b),
      0.5,
    );
    for (const t of typeStats) {
      const excess = Math.max(0, t.avgWaitHours - medianWait);
      t.bottleneckScore = round(excess * Math.log2(1 + t.open) + t.reworkRate * 0.25);
      const reasons: string[] = [];
      if (excess > 4) reasons.push(`waits ${round(excess)}h longer than the median asset type`);
      if (t.open >= 3) reasons.push(`${t.open} items open right now`);
      if (t.reworkRate >= 40) reasons.push(`${t.reworkRate}% sent back for changes`);
      if (t.avgDecisionHours >= 48) reasons.push(`${round(t.avgDecisionHours)}h to a decision`);
      t.bottleneckReason = reasons.join(" · ");
    }

    typeStats.sort((a, b) => b.bottleneckScore - a.bottleneckScore || b.open - a.open);

    const decidedTotal = all.filter((r) => r.decided_at).length;
    return {
      windowDays,
      totals: {
        submitted: all.length,
        open: waiting.length + rework.length,
        decided: decidedTotal,
        approved: all.filter((r) => r.status === "approved").length,
        changesRequested: all.filter((r) => r.status === "changes_requested").length,
        throughputPerWeek: round((decidedTotal / Math.max(1, windowDays)) * 7),
      },
      states,
      types: typeStats,
      bottlenecks: typeStats.filter((t) => t.bottleneckScore > 0 && t.open > 0).slice(0, 3),
      isReviewer,
    };
  });
