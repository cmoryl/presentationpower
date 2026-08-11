/**
 * PACK CONTRAST REGRESSION
 * ========================
 *
 * A single, DOM-free audit of every alternate look (style pack) in both of the
 * registers they ship in: a light pack must stay a light sheet with readable
 * ink, a dark pack must stay a dark sheet with readable ink.
 *
 * It exists because the failure mode here is silent. A pack's ground plane is
 * decorative — a bloom, a rail, a grain plate — and a small change to any of
 * those shifts the luminance behind the copy. Nothing crashes; the deck just
 * quietly becomes unreadable, or the readability guard veils the design with a
 * scrim to save it. Both are regressions, so both fail here.
 *
 * Rules enforced (see THRESHOLDS):
 *  1. Every ink role clears its WCAG AA ratio against BOTH ends of the pack's
 *     own background envelope, after automatic ink correction.
 *  2. No pack needs a reading scrim. A scrim means correction alone could not
 *     save the look — the pack's own ground must be re-tuned instead.
 *  3. The readability damp still keeps most of the authored ground opacity —
 *     otherwise the guard is silently deleting the design to stay readable.
 *  4. Tonal register holds: a light pack's darkest composited background stays
 *     above LIGHT_FLOOR, a dark pack's lightest stays below DARK_CEILING. This
 *     is what stops "light" looks from drifting into mid-gray and reading as
 *     dark (and as each other).
 *
 * Consumed by src/lib/__tests__/pack-contrast-regression.test.ts and by the
 * build-time gate in vite.config.ts, so a drop in readability fails the build.
 */

import { contrastRatio, targetThresholds, type WcagTarget } from "./contrast-audit";
import { packBackgroundEnvelope, packReadability } from "./pack-readability";
import { packGroundDamp } from "./pack-readability";
import { STYLE_PACKS, packGroundOpacity, type StylePack } from "./style-packs";

export const THRESHOLDS = {
  /** WCAG level every ink role must clear after correction. */
  target: "AA" as WcagTarget,
  /** Lowest relative luminance a LIGHT pack's darkest background may reach. */
  lightFloor: 0.5,
  /** Highest relative luminance a DARK pack's lightest background may reach. */
  darkCeiling: 0.3,
  /** A pack needing any reading scrim is a failure, not a save. */
  maxScrimAlpha: 0,
  /**
   * Smallest share of a pack's authored ground opacity the guard may keep.
   * The guard damps the decorative plane to hold the tonal register, which
   * means a ground that has drifted too dark gets silently suppressed instead
   * of failing. Below this share the design intent is gone — treat it as the
   * regression it is.
   */
  minGroundRetention: 0.45,
} as const;

const INK_VARS = {
  ink: "--pack-ink",
  inkMuted: "--pack-ink-muted",
  inkFaint: "--pack-ink-faint",
  accentText: "--pack-accent-text",
} as const;

/** Large-text roles are allowed the AA-Large ratio. */
const LARGE_ROLES = new Set(["inkFaint", "accentText"]);

export type PackContrastIssue = {
  packId: string;
  mode: "light" | "dark";
  rule: "ink-contrast" | "scrim-required" | "tonal-register" | "ground-suppressed";
  detail: string;
};

export type PackContrastRow = {
  packId: string;
  label: string;
  mode: "light" | "dark";
  /** Worst post-correction ink ratio on this pack. */
  worstRatio: number;
  scrimAlpha: number;
  /** Luminance of the composited background end that matters for this mode. */
  registerLuminance: number;
  /** Share of the authored ground opacity that survives the readability damp. */
  groundRetention: number;
  issues: PackContrastIssue[];
};

function relLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const chan = (i: number) => {
    const v = parseInt(h.slice(i * 2, i * 2 + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(0) + 0.7152 * chan(1) + 0.0722 * chan(2);
}

/** Audit one pack in the register it ships in. */
export function auditPackContrast(pack: StylePack): PackContrastRow {
  const th = targetThresholds(THRESHOLDS.target);
  const guard = packReadability(pack, THRESHOLDS.target);
  const env = packBackgroundEnvelope(pack);
  const issues: PackContrastIssue[] = [];
  let worstRatio = Number.POSITIVE_INFINITY;

  for (const [role, cssVar] of Object.entries(INK_VARS) as [keyof typeof INK_VARS, string][]) {
    const resolved = guard.vars[cssVar] ?? pack.tokens[role] ?? pack.tokens.ink;
    const required = LARGE_ROLES.has(role) ? th.large : th.normal;
    const worst = Math.min(
      contrastRatio(resolved, env.lightest),
      contrastRatio(resolved, env.darkest),
    );
    worstRatio = Math.min(worstRatio, worst / required);
    if (worst < required - 0.01) {
      issues.push({
        packId: pack.id,
        mode: pack.mode,
        rule: "ink-contrast",
        detail: `${role} (${resolved}) is ${worst.toFixed(2)}:1 against ${
          contrastRatio(resolved, env.lightest) < contrastRatio(resolved, env.darkest)
            ? env.lightest
            : env.darkest
        }, needs ${required}:1`,
      });
    }
  }

  if (guard.scrimAlpha > THRESHOLDS.maxScrimAlpha) {
    issues.push({
      packId: pack.id,
      mode: pack.mode,
      rule: "scrim-required",
      detail: `needs a ${guard.scrimAlpha.toFixed(2)} reading scrim — re-tune the pack ground instead of veiling it`,
    });
  }

  const registerLuminance =
    pack.mode === "light" ? relLuminance(env.darkest) : relLuminance(env.lightest);
  if (pack.mode === "light" && registerLuminance < THRESHOLDS.lightFloor) {
    issues.push({
      packId: pack.id,
      mode: "light",
      rule: "tonal-register",
      detail: `darkest background ${env.darkest} has luminance ${registerLuminance.toFixed(3)}, below the light floor ${THRESHOLDS.lightFloor}`,
    });
  }
  if (pack.mode === "dark" && registerLuminance > THRESHOLDS.darkCeiling) {
    issues.push({
      packId: pack.id,
      mode: "dark",
      rule: "tonal-register",
      detail: `lightest background ${env.lightest} has luminance ${registerLuminance.toFixed(3)}, above the dark ceiling ${THRESHOLDS.darkCeiling}`,
    });
  }

  const authored = packGroundOpacity(pack);
  const groundRetention = authored > 0 ? packGroundDamp(pack) / authored : 1;
  if (authored > 0.1 && groundRetention < THRESHOLDS.minGroundRetention) {
    issues.push({
      packId: pack.id,
      mode: pack.mode,
      rule: "ground-suppressed",
      detail: `readability damp keeps only ${(groundRetention * 100).toFixed(0)}% of the authored ground opacity (${authored}) — the ground is too ${pack.mode === "light" ? "dark" : "light"} for this register`,
    });
  }

  return {
    packId: pack.id,
    label: pack.label,
    mode: pack.mode,
    groundRetention: Math.round(groundRetention * 100) / 100,
    worstRatio: Math.round(worstRatio * 100) / 100,
    scrimAlpha: guard.scrimAlpha,
    registerLuminance: Math.round(registerLuminance * 1000) / 1000,
    issues,
  };
}

export type PackContrastReport = {
  rows: PackContrastRow[];
  issues: PackContrastIssue[];
  passes: boolean;
};

/** Audit every registered alternate look. */
export function auditAllPackContrast(packs: StylePack[] = STYLE_PACKS): PackContrastReport {
  const rows = packs.map(auditPackContrast);
  const issues = rows.flatMap((r) => r.issues);
  return { rows, issues, passes: issues.length === 0 };
}

/** Human-readable failure text for the build gate / CI output. */
export function formatPackContrastFailures(report: PackContrastReport): string {
  const byPack = new Map<string, PackContrastIssue[]>();
  for (const issue of report.issues) {
    const list = byPack.get(issue.packId) ?? [];
    list.push(issue);
    byPack.set(issue.packId, list);
  }
  const lines: string[] = [
    `Contrast regression: ${report.issues.length} issue(s) across ${byPack.size} of ${report.rows.length} alternate looks (WCAG ${THRESHOLDS.target}).`,
  ];
  for (const [packId, issues] of byPack) {
    const row = report.rows.find((r) => r.packId === packId)!;
    lines.push(`  • ${packId} (${row.mode})`);
    for (const issue of issues) lines.push(`      ${issue.rule}: ${issue.detail}`);
  }
  return lines.join("\n");
}
