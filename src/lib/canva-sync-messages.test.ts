import { describe, expect, it } from "vitest";
import { describeLastRun, explainSyncError, type CanvaLastRun } from "./canva-sync-messages";

const run = (over: Partial<CanvaLastRun["run"]> = {}) => ({
  startedAt: "2026-11-12T14:40:00.000Z", finishedAt: "2026-11-12T14:45:00.000Z", trigger: "daily",
  checked: 120, synced: 25, failed: 0, remaining: 188, stoppedReason: null, ...over,
});

describe("describeLastRun", () => {
  it("says nothing when nothing has run", () => expect(describeLastRun({ lastCheckedAt: null, run: null })).toBeNull());
  it("shows the last check date alone", () => {
    const line = describeLastRun({ lastCheckedAt: "2026-11-12T15:58:00.000Z", run: null })!;
    expect(line).toMatch(/^Last check: /);
    expect(line).not.toMatch(/Last update run/);
  });
  it("names the run, its counts and what is still waiting", () => {
    const line = describeLastRun({ lastCheckedAt: "2026-11-12T15:58:00.000Z", run: run() })!;
    expect(line).toMatch(/Last check: /);
    expect(line).toMatch(/Last update run: .*\(automatic\) — 25 updated, 120 checked, 188 still waiting/);
    expect(line).not.toMatch(/problems/);
  });
  it("calls a manual run manual and reports problems", () => {
    const line = describeLastRun({ lastCheckedAt: null, run: run({ trigger: "manual", failed: 3 }) })!;
    expect(line).toMatch(/\(manual\) — 25 updated, 120 checked, 3 with problems/);
  });
  it("says why a run stopped early", () => {
    const line = describeLastRun({ lastCheckedAt: null, run: run({ stoppedReason: "Canva's daily download allowance ran out; the rest continue tomorrow." }) })!;
    expect(line).toMatch(/Stopped early: Canva's daily download allowance ran out/);
  });
});

describe("explainSyncError", () => {
  it("403 asks to reconnect", () => expect(explainSyncError("Canva refused the export [403]: x").next).toMatch(/reconnect/i));
  it("429 says daily allowance", () => expect(explainSyncError("Canva export failed [429]: too many").what).toMatch(/daily download allowance/));
  it("AI labels keep old picture", () => expect(explainSyncError("Hidden AI labels could not be removed; picture not published").what).toMatch(/wasn't published/));
  it("missing design", () => expect(explainSyncError("Not found in the shared Canva account").what).toMatch(/isn't in the shared/));
});
