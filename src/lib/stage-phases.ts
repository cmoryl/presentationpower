// Pure operations for the numbered stage modules (MV-PROC-STAGE-ORBITS).
//
// A stage module authors its content as `stages[]`, each stage carrying a
// numeral, a name, its medallion imagery and its own task chain (`items[]`).
// The editor panel needs add / remove / reorder / renumber for both levels, and
// the export + QA layers need the same clamping rules. Keeping the ops here
// (pure, no React) means the panel stays thin and every rule is unit-testable.

export type StageTask = {
  label?: string;
  body?: string;
  icon?: string;
  [k: string]: unknown;
};

export type StagePhase = {
  stepNumber?: string;
  label?: string;
  mediaSeed?: string;
  mediaUrl?: string;
  items?: StageTask[];
  [k: string]: unknown;
};

/** Hard caps — mirrored in the module manifest capacity (taxonomy.ts). */
export const MAX_PHASES = 6;
export const MIN_PHASES = 2;
export const MAX_TASKS = 6;

export function readPhases(raw: unknown): StagePhase[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({
      ...s,
      items: Array.isArray(s.items)
        ? (s.items.filter((t) => !!t && typeof t === "object") as StageTask[])
        : [],
    })) as StagePhase[];
}

/** Keep the visible numerals in sequence after add / remove / reorder. */
export function renumberPhases(phases: readonly StagePhase[]): StagePhase[] {
  return phases.map((p, i) => ({ ...p, stepNumber: String(i + 1) }));
}

export function addPhase(phases: readonly StagePhase[]): StagePhase[] {
  if (phases.length >= MAX_PHASES) return [...phases];
  const n = phases.length + 1;
  return renumberPhases([
    ...phases,
    {
      stepNumber: String(n),
      label: `Stage ${n}`,
      mediaSeed: `stage-${n}`,
      items: [{ label: "New task", icon: "" }],
    },
  ]);
}

export function removePhase(phases: readonly StagePhase[], index: number): StagePhase[] {
  if (phases.length <= MIN_PHASES) return [...phases];
  return renumberPhases(phases.filter((_, i) => i !== index));
}

export function movePhase(
  phases: readonly StagePhase[],
  index: number,
  dir: -1 | 1,
): StagePhase[] {
  const j = index + dir;
  if (index < 0 || j < 0 || index >= phases.length || j >= phases.length) return [...phases];
  const next = [...phases];
  const a = next[index]!;
  next[index] = next[j]!;
  next[j] = a;
  return renumberPhases(next);
}

export function patchPhase(
  phases: readonly StagePhase[],
  index: number,
  patch: Partial<StagePhase>,
): StagePhase[] {
  return phases.map((p, i) => (i === index ? { ...p, ...patch } : p));
}

function tasksOf(phase: StagePhase | undefined): StageTask[] {
  return Array.isArray(phase?.items) ? (phase!.items as StageTask[]) : [];
}

export function addTask(phases: readonly StagePhase[], phaseIndex: number): StagePhase[] {
  const tasks = tasksOf(phases[phaseIndex]);
  if (tasks.length >= MAX_TASKS) return [...phases];
  return patchPhase(phases, phaseIndex, { items: [...tasks, { label: "New task", icon: "" }] });
}

export function removeTask(
  phases: readonly StagePhase[],
  phaseIndex: number,
  taskIndex: number,
): StagePhase[] {
  const tasks = tasksOf(phases[phaseIndex]);
  if (tasks.length <= 1) return [...phases];
  return patchPhase(phases, phaseIndex, { items: tasks.filter((_, i) => i !== taskIndex) });
}

export function moveTask(
  phases: readonly StagePhase[],
  phaseIndex: number,
  taskIndex: number,
  dir: -1 | 1,
): StagePhase[] {
  const tasks = [...tasksOf(phases[phaseIndex])];
  const j = taskIndex + dir;
  if (taskIndex < 0 || j < 0 || taskIndex >= tasks.length || j >= tasks.length) return [...phases];
  const a = tasks[taskIndex]!;
  tasks[taskIndex] = tasks[j]!;
  tasks[j] = a;
  return patchPhase(phases, phaseIndex, { items: tasks });
}

export function patchTask(
  phases: readonly StagePhase[],
  phaseIndex: number,
  taskIndex: number,
  patch: Partial<StageTask>,
): StagePhase[] {
  const tasks = tasksOf(phases[phaseIndex]).map((t, i) =>
    i === taskIndex ? { ...t, ...patch } : t,
  );
  return patchPhase(phases, phaseIndex, { items: tasks });
}

/** Clamp authored content to what the module can actually hold on stage. */
export function clampPhases(phases: readonly StagePhase[]): StagePhase[] {
  return phases
    .slice(0, MAX_PHASES)
    .map((p) => ({ ...p, items: tasksOf(p).slice(0, MAX_TASKS) }));
}

/**
 * Type-size tier for a given phase count. Two/three stages get the wide
 * treatment from the reference art; five and six compress the medallion, the
 * numeral and the task rows so nothing collides on the 1920×1080 stage.
 */
export type StageTier = "wide" | "mid" | "compact";

export function stageTier(count: number): StageTier {
  if (count <= 3) return "wide";
  if (count === 4) return "mid";
  return "compact";
}

export function stageMetrics(count: number, taskMax = 3) {
  const tier = stageTier(count);
  // Five and six stages read as "bulky" with the four-stage weights: the rings,
  // chevrons and icon wells all stay heavy while the columns narrow. `slim`
  // lets the renderer lighten that chrome, not just shrink it.
  const slim = count >= 5;
  const dense = taskMax > 4;
  const base =
    tier === "wide"
      ? { medallion: 380, iconBox: 78, taskSize: 27, numeral: 96, stageName: 40, gap: 28, chev: 58 }
      : tier === "mid"
        ? { medallion: 310, iconBox: 64, taskSize: 22, numeral: 74, stageName: 32, gap: 18, chev: 44 }
        : { medallion: 214, iconBox: 46, taskSize: 18, numeral: 52, stageName: 22, gap: 16, chev: 26 };
  if (!dense) return { tier, slim, ...base };
  // More than four tasks in a chain: shave the medallion and rows to keep the
  // whole stack inside the stage height.
  return {
    tier,
    slim,
    ...base,
    medallion: Math.round(base.medallion * 0.82),
    iconBox: Math.round(base.iconBox * 0.84),
    taskSize: Math.max(16, Math.round(base.taskSize * 0.86)),
    numeral: Math.round(base.numeral * 0.84),
    stageName: Math.max(18, Math.round(base.stageName * 0.86)),
  };
}


/**
 * Fit the stage name (and its numeral) inside the photo medallion.
 *
 * The medallion is a circle, so usable text width narrows away from the
 * centre line. Long labels like "PROJECT ANALYSIS & PRE-FLIGHT" overran the
 * ring at the fixed tier size; this shrinks the label until its longest word
 * fits one line and the whole label fits the allowed number of lines.
 */
export function stageLabelFit(
  label: string,
  base: { medallion: number; numeral: number; stageName: number },
) {
  const text = String(label || "").trim();
  if (!text) return { stageName: base.stageName, numeral: base.numeral, maxLines: 3 };
  // Text column inside the disc: medallion minus the ring inset and padding.
  const boxWidth = base.medallion * 0.78 * 0.76;
  const words = text.split(/\s+/);
  const longest = words.reduce((m, w) => Math.max(m, w.length), 0);
  const totalChars = text.length;
  // Uppercase bold Geist averages ~0.62em per glyph.
  const perChar = 0.62;
  const maxLines = totalChars > 26 ? 4 : 3;
  const byWord = boxWidth / (longest * perChar);
  // Every line loses width near the circle edge, so assume ~86% average fill.
  const byBlock = (boxWidth * 0.86 * maxLines) / (totalChars * perChar);
  const size = Math.max(12, Math.min(base.stageName, Math.floor(Math.min(byWord, byBlock))));
  // Pull the numeral down with a heavily shrunk label so the pair stays balanced.
  const ratio = size / base.stageName;
  const numeral = Math.round(base.numeral * (ratio < 1 ? Math.max(0.6, 0.55 + ratio * 0.45) : 1));
  return { stageName: size, numeral, maxLines };
}
