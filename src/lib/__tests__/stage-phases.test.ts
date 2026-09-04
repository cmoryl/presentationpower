import { describe, expect, it } from "vitest";
import {
  MAX_PHASES,
  MAX_TASKS,
  addPhase,
  addTask,
  clampPhases,
  movePhase,
  moveTask,
  patchPhase,
  patchTask,
  readPhases,
  removePhase,
  removeTask,
  renumberPhases,
  stageMetrics,
  stageTier,
  type StagePhase,
} from "@/lib/stage-phases";
import { MODULE_VARIANTS, byId } from "@/lib/taxonomy";

const base = (): StagePhase[] => [
  { stepNumber: "1", label: "Pre-flight", items: [{ label: "Timeline", icon: "Calendar" }] },
  { stepNumber: "2", label: "Production", items: [{ label: "Translate", icon: "Globe2" }] },
];

describe("stage phase ops", () => {
  it("reads only object rows and normalizes items", () => {
    const phases = readPhases([{ label: "A" }, null, "x", { label: "B", items: [{ label: "t" }] }]);
    expect(phases).toHaveLength(2);
    expect(phases[0]!.items).toEqual([]);
    expect(phases[1]!.items).toHaveLength(1);
  });

  it("adds phases up to the manifest maximum and renumbers", () => {
    let phases = base();
    while (phases.length < MAX_PHASES) phases = addPhase(phases);
    expect(phases).toHaveLength(MAX_PHASES);
    expect(addPhase(phases)).toHaveLength(MAX_PHASES);
    expect(phases.map((p) => p.stepNumber)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(phases[5]!.items).toHaveLength(1);
  });

  it("keeps the minimum of two phases", () => {
    const phases = removePhase(base(), 0);
    expect(phases).toHaveLength(2);
    expect(removePhase(addPhase(base()), 1).map((p) => p.label)).toEqual(["Pre-flight", "Stage 3"]);
  });

  it("reorders phases and re-sequences the numerals", () => {
    const phases = movePhase(base(), 0, 1);
    expect(phases.map((p) => p.label)).toEqual(["Production", "Pre-flight"]);
    expect(phases.map((p) => p.stepNumber)).toEqual(["1", "2"]);
    expect(movePhase(base(), 0, -1).map((p) => p.label)).toEqual(["Pre-flight", "Production"]);
  });

  it("edits phase and task fields without touching siblings", () => {
    const phases = patchPhase(base(), 1, { label: "Delivery", mediaSeed: "seed-x" });
    expect(phases[1]!.label).toBe("Delivery");
    expect(phases[0]!.label).toBe("Pre-flight");
    const tasked = patchTask(phases, 0, 0, { body: "Detail", icon: "Search" });
    expect(tasked[0]!.items![0]).toMatchObject({ label: "Timeline", body: "Detail", icon: "Search" });
  });

  it("adds, moves and removes tasks within a phase cap", () => {
    let phases = base();
    while ((phases[0]!.items ?? []).length < MAX_TASKS) phases = addTask(phases, 0);
    expect(phases[0]!.items).toHaveLength(MAX_TASKS);
    expect(addTask(phases, 0)[0]!.items).toHaveLength(MAX_TASKS);
    const moved = moveTask(phases, 0, 0, 1);
    expect(moved[0]!.items![1]!.label).toBe("Timeline");
    expect(removeTask(phases, 1, 0)[1]!.items).toHaveLength(1);
  });

  it("clamps over-long authored content to what the stage can hold", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      label: `S${i}`,
      items: Array.from({ length: 9 }, (_, j) => ({ label: `t${j}` })),
    }));
    const clamped = clampPhases(many);
    expect(clamped).toHaveLength(MAX_PHASES);
    expect(clamped[0]!.items).toHaveLength(MAX_TASKS);
  });

  it("renumbers idempotently", () => {
    expect(renumberPhases(renumberPhases(base())).map((p) => p.stepNumber)).toEqual(["1", "2"]);
  });

  it("scales type down as phases and tasks increase", () => {
    expect(stageTier(2)).toBe("wide");
    expect(stageTier(4)).toBe("mid");
    expect(stageTier(6)).toBe("compact");
    const wide = stageMetrics(3, 3);
    const compact = stageMetrics(6, 3);
    expect(compact.medallion).toBeLessThan(wide.medallion);
    expect(compact.taskSize).toBeLessThan(wide.taskSize);
    const dense = stageMetrics(6, 6);
    expect(dense.medallion).toBeLessThan(compact.medallion);
    expect(dense.taskSize).toBeGreaterThanOrEqual(16);
  });

  it("matches the module manifest capacity", () => {
    const v = byId(MODULE_VARIANTS, "MV-PROC-STAGE-ORBITS")!;
    expect(v.capacity.items?.max).toBe(MAX_PHASES);
    expect(v.capacity.items?.min).toBe(2);
    expect(v.editableFields).toContain("stages[].items[].body");
  });
});
