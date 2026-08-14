// Actionable compatibility report for an imported PowerPoint.
//
// Renders the persisted `extras.screening` payload produced at import time by
// pptx-package-validate + pptx-source-detect + pptx-compat-diagnose: scores,
// detected source application, package findings and the grouped issue list
// split into "safe to fix" and "needs a human".
import { useMemo, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Info,
  ShieldAlert,
  Wrench,
} from "lucide-react";

import type {
  CompatIssue,
  CompatScores,
  FixKind,
  IssueCategory,
  IssueSeverity,
} from "@/lib/pptx-compat-diagnose";

/** Shape persisted in `imported_decks.extras.screening` (see buildScreeningExtra). */
export type StoredScreening = {
  sniff: { kind: string; container: string; extensionMismatch: boolean };
  package: {
    entryCount: number;
    expandedBytes: number;
    hasMacros: boolean;
    hasOleEmbeds: boolean;
    risks: Array<{ code: string; severity: string; message: string }>;
  };
  source: {
    sourceId: string;
    label: string;
    confidence: number;
    version: string | null;
    signals: Array<{ channel: string; detail: string }>;
  };
  compat: {
    scores: CompatScores | null;
    totals: {
      bySeverity: Record<IssueSeverity, number>;
      byCategory: Record<IssueCategory, number>;
      bySlide: Record<number, number>;
    } | null;
    objects: { source: number; recovered: number; editable: number; fallback: number } | null;
    substitutedFonts: string[];
    issueCount: number;
    issuesTruncated: boolean;
    issues: CompatIssue[];
  };
};

const SEVERITY_ORDER: IssueSeverity[] = ["blocker", "high", "medium", "low", "info"];

const SEVERITY_LABEL: Record<IssueSeverity, string> = {
  blocker: "Blocker",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

// Severity tone uses semantic tokens only so both themes stay readable.
const SEVERITY_TONE: Record<IssueSeverity, string> = {
  blocker: "border-destructive/60 bg-destructive/10 text-destructive",
  high: "border-destructive/40 bg-destructive/5 text-destructive",
  medium: "border-primary/40 bg-primary/5 text-primary",
  low: "border-border bg-muted/50 text-muted-foreground",
  info: "border-border bg-muted/30 text-muted-foreground",
};

const CATEGORY_LABEL: Record<IssueCategory, string> = {
  fonts: "Fonts",
  text: "Text",
  layout: "Layout",
  imagery: "Imagery",
  charts: "Charts & SmartArt",
  media: "Media & embeds",
  links: "Links",
  brand: "Brand",
  masters: "Masters & layouts",
  accessibility: "Accessibility",
  integrity: "Integrity",
};

const FIX_LABEL: Record<FixKind, string> = {
  safe: "Safe auto-fix",
  review: "Needs review",
  manual: "Manual work",
};

function SeverityIcon({ severity }: { severity: IssueSeverity }) {
  const cls = "size-4 shrink-0";
  if (severity === "blocker") return <AlertOctagon className={cls} strokeWidth={1.75} />;
  if (severity === "high" || severity === "medium")
    return <AlertTriangle className={cls} strokeWidth={1.75} />;
  return <Info className={cls} strokeWidth={1.75} />;
}

function ScoreDial({ label, value, hint }: { label: string; value: number; hint: string }) {
  const tone =
    value >= 90 ? "text-primary" : value >= 70 ? "text-foreground" : "text-destructive";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-2xl font-semibold tabular-nums ${tone}`}>{value}%</div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={value >= 70 ? "h-full rounded-full bg-primary" : "h-full rounded-full bg-destructive"}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}

export function CompatibilityReport({
  screening,
  onOpenSlide,
}: {
  screening: StoredScreening;
  /** Jump to a slide in the repair workspace (report rows are clickable when set). */
  onOpenSlide?: (slideIndex: number) => void;
}) {
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | "all">("all");
  const [fixFilter, setFixFilter] = useState<FixKind | "all">("all");

  const issues = screening.compat.issues ?? [];
  const scores = screening.compat.scores;
  const objects = screening.compat.objects;
  const totals = screening.compat.totals;

  const filtered = useMemo(
    () =>
      issues.filter(
        (i) =>
          (severityFilter === "all" || i.severity === severityFilter) &&
          (categoryFilter === "all" || i.category === categoryFilter) &&
          (fixFilter === "all" || i.fix === fixFilter),
      ),
    [issues, severityFilter, categoryFilter, fixFilter],
  );

  const grouped = useMemo(() => {
    const map = new Map<IssueCategory, CompatIssue[]>();
    for (const issue of filtered) {
      const list = map.get(issue.category) ?? [];
      list.push(issue);
      map.set(issue.category, list);
    }
    return [...map.entries()].sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a[1][0].severity) - SEVERITY_ORDER.indexOf(b[1][0].severity) ||
        b[1].length - a[1].length,
    );
  }, [filtered]);

  const safeCount = issues.filter((i) => i.fix === "safe").length;
  const reviewCount = issues.length - safeCount;
  const categoriesPresent = SEVERITY_ORDER.length
    ? ([...new Set(issues.map((i) => i.category))] as IssueCategory[])
    : [];

  return (
    <section className="space-y-4">
      {/* Scores + provenance */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreDial
          label="Compatibility"
          value={scores?.compatibility ?? 0}
          hint="Weighted by how many findings block faithful reuse."
        />
        <ScoreDial
          label="Editable"
          value={scores?.editablePercent ?? 0}
          hint={
            objects
              ? `${objects.editable} of ${objects.recovered} recovered objects are editable.`
              : "Share of recovered objects you can still edit."
          }
        />
        <ScoreDial
          label="Visual fidelity"
          value={scores?.visualFidelity ?? 0}
          hint={
            objects
              ? `${objects.recovered} of ${objects.source} source objects rebuilt.`
              : "How close the rebuild is to the original render."
          }
        />
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            <FileSearch className="size-3.5" strokeWidth={1.75} /> Detected source
          </div>
          <div className="mt-0.5 truncate text-sm font-medium" title={screening.source.label}>
            {screening.source.label}
            {screening.source.version ? ` · ${screening.source.version}` : ""}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {Math.round(screening.source.confidence * 100)}% confidence ·{" "}
            {screening.sniff.kind.toUpperCase()} package
          </div>
          {screening.source.signals.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-muted-foreground">
              {screening.source.signals.slice(0, 3).map((sig, i) => (
                <li key={`${sig.channel}-${i}`} className="truncate" title={sig.detail}>
                  · {sig.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Package + font notices */}
      {(screening.package.risks.length > 0 ||
        screening.sniff.extensionMismatch ||
        screening.compat.substitutedFonts.length > 0) && (
        <div className="space-y-1.5">
          {screening.sniff.extensionMismatch && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-2.5 text-xs">
              <ShieldAlert className="mt-0.5 size-3.5 text-primary" strokeWidth={1.75} />
              <span>
                The file extension did not match the package contents — it was imported as a{" "}
                {screening.sniff.kind.toUpperCase()} package.
              </span>
            </div>
          )}
          {screening.package.risks.map((risk) => (
            <div
              key={risk.code}
              className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-2.5 text-xs"
            >
              <ShieldAlert className="mt-0.5 size-3.5 text-primary" strokeWidth={1.75} />
              <span>{risk.message}</span>
            </div>
          ))}
          {screening.compat.substitutedFonts.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-2.5 text-xs">
              <AlertTriangle className="mt-0.5 size-3.5 text-primary" strokeWidth={1.75} />
              <span>
                Fonts not available here: {screening.compat.substitutedFonts.join(", ")} — text keeps
                its size and spacing, but glyphs are substituted.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1">
          <Wrench className="size-3.5" strokeWidth={1.75} /> {safeCount} safe · {reviewCount} to
          review
        </span>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as IssueSeverity | "all")}
          className="h-8 rounded-md border border-border bg-background px-2"
          aria-label="Filter by severity"
        >
          <option value="all">All severities</option>
          {SEVERITY_ORDER.filter((s) => (totals?.bySeverity?.[s] ?? 0) > 0).map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABEL[s]} ({totals?.bySeverity?.[s] ?? 0})
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as IssueCategory | "all")}
          className="h-8 rounded-md border border-border bg-background px-2"
          aria-label="Filter by category"
        >
          <option value="all">All areas</option>
          {categoriesPresent.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <select
          value={fixFilter}
          onChange={(e) => setFixFilter(e.target.value as FixKind | "all")}
          className="h-8 rounded-md border border-border bg-background px-2"
          aria-label="Filter by fix type"
        >
          <option value="all">Any fix type</option>
          <option value="safe">Safe auto-fix</option>
          <option value="review">Needs review</option>
          <option value="manual">Manual work</option>
        </select>
        {screening.compat.issuesTruncated && (
          <span className="text-muted-foreground">
            Showing the first {issues.length} of {screening.compat.issueCount} findings.
          </span>
        )}
      </div>

      {/* Issue list */}
      {issues.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm">
          <CheckCircle2 className="size-4 text-primary" strokeWidth={1.75} />
          No compatibility issues found — every object was rebuilt as editable content.
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          No findings match these filters.
        </p>
      ) : (
        <div className="space-y-3">
          {grouped.map(([category, list]) => (
            <div key={category} className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <h3 className="text-sm font-medium">{CATEGORY_LABEL[category]}</h3>
                <span className="text-xs text-muted-foreground">{list.length} findings</span>
              </div>
              <ul className="divide-y divide-border">
                {list.map((issue) => {
                  const clickable = onOpenSlide && issue.slideIndex !== null;
                  return (
                    <li key={issue.id} className="px-3 py-2.5">
                      <div className="flex flex-wrap items-start gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${SEVERITY_TONE[issue.severity]}`}
                        >
                          <SeverityIcon severity={issue.severity} />
                          {SEVERITY_LABEL[issue.severity]}
                        </span>
                        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {FIX_LABEL[issue.fix]}
                        </span>
                        {issue.slideIndex !== null &&
                          (clickable ? (
                            <button
                              type="button"
                              onClick={() => onOpenSlide!(issue.slideIndex!)}
                              className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                            >
                              Slide {issue.slideIndex + 1} →
                            </button>
                          ) : (
                            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              Slide {issue.slideIndex + 1}
                            </span>
                          ))}
                        <span className="min-w-[12rem] flex-1 text-sm">{issue.title}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {issue.detail}
                      </p>
                      {issue.fixLabel && (
                        <p className="mt-1 text-xs leading-relaxed">
                          <span className="font-medium">Fix:</span> {issue.fixLabel}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
